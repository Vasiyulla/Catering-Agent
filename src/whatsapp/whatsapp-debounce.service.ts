import { Injectable, Logger } from '@nestjs/common';

export type ProcessMessageCallback = (from: string, senderName: string, aggregatedMessage: string) => Promise<void>;

interface DebounceEntry {
  timer: NodeJS.Timeout;
  senderName: string;
  messages: string[];
}

@Injectable()
export class WhatsAppDebounceService {
  private readonly logger = new Logger(WhatsAppDebounceService.name);
  private readonly processedWamids: Set<string> = new Set();
  private readonly pendingQueues: Map<string, DebounceEntry> = new Map();
  private readonly DEBOUNCE_MS = 3000; // 3-second sliding window

  /**
   * Drops duplicate Meta webhook delivery retries
   */
  public isDuplicate(wamid: string): boolean {
    if (this.processedWamids.has(wamid)) {
      this.logger.warn(`Dropping duplicate WhatsApp message id (wamid): ${wamid}`);
      return true;
    }
    this.processedWamids.add(wamid);
    // Cleanup cache if it grows past 10,000 items
    if (this.processedWamids.size > 10000) {
      const firstEntries = Array.from(this.processedWamids).slice(0, 2000);
      firstEntries.forEach((id) => this.processedWamids.delete(id));
    }
    return false;
  }

  /**
   * Buffers rapid-fire user messages into an aggregated string
   */
  public bufferMessage(
    from: string,
    senderName: string,
    text: string,
    onFlush: ProcessMessageCallback,
  ): void {
    const existing = this.pendingQueues.get(from);

    if (existing) {
      clearTimeout(existing.timer);
      existing.messages.push(text);
      existing.senderName = senderName || existing.senderName;

      existing.timer = setTimeout(async () => {
        await this.flush(from, onFlush);
      }, this.DEBOUNCE_MS);

      this.logger.log(`Buffered message from ${from}. Current buffer count: ${existing.messages.length}`);
    } else {
      const timer = setTimeout(async () => {
        await this.flush(from, onFlush);
      }, this.DEBOUNCE_MS);

      this.pendingQueues.set(from, {
        timer,
        senderName,
        messages: [text],
      });
      this.logger.log(`Started 3-second debounce window for ${from}`);
    }
  }

  private async flush(from: string, onFlush: ProcessMessageCallback): Promise<void> {
    const entry = this.pendingQueues.get(from);
    if (!entry) return;

    this.pendingQueues.delete(from);
    const combinedMessage = entry.messages.join(' \n');
    this.logger.log(`Flushing aggregated message for ${from} (${entry.messages.length} parts): "${combinedMessage}"`);

    try {
      await onFlush(from, entry.senderName, combinedMessage);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error processing flushed message for ${from}: ${error.message}`);
    }
  }
}

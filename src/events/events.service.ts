import { Injectable, Logger, MessageEvent } from '@nestjs/common';
import { Subject, Observable, merge, interval } from 'rxjs';
import { map } from 'rxjs/operators';

export interface CateringEvent {
  type:
    | 'ORDER_CREATED'
    | 'ORDER_UPDATED'
    | 'MESSAGE_LOGGED'
    | 'HANDOFF_CREATED'
    | 'HANDOFF_RESOLVED'
    | 'AGENT_THINKING'
    | 'AGENT_DECISION'
    | 'HEARTBEAT';
  payload: any;
  timestamp: string;
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly eventSubject = new Subject<CateringEvent>();

  /**
   * Dispatches a real-time event to all connected dashboard SSE subscribers
   */
  public emit(type: CateringEvent['type'], payload: any): void {
    const event: CateringEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.logger.log(`⚡ [REALTIME_EVENT] ${type}`);
    this.eventSubject.next(event);
  }

  /**
   * Returns reactive SSE stream with keep-alive heartbeats
   */
  public getStream(): Observable<MessageEvent> {
    const events$ = this.eventSubject.asObservable().pipe(
      map(
        (evt) =>
          ({
            data: evt,
          }) as MessageEvent,
      ),
    );

    // Heartbeat every 20 seconds prevents proxy disconnections (Vercel/Render/Nginx)
    const heartbeat$ = interval(20000).pipe(
      map(
        () =>
          ({
            data: {
              type: 'HEARTBEAT',
              payload: { status: 'alive' },
              timestamp: new Date().toISOString(),
            },
          }) as MessageEvent,
      ),
    );

    return merge(events$, heartbeat$);
  }
}

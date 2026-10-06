import { Annotation } from '@langchain/langgraph';

export interface CateringOrderItem {
  itemId: string;
  name: string;
  category: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface InteractiveButtonState {
  id: string;
  title: string;
}

export const CateringStateAnnotation = Annotation.Root({
  // Identifiers
  phoneNumber: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  customerName: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  // Conversation tracking
  currentStage: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => 'GREETING',
  }),
  lastUserMessage: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  conversationHistory: Annotation<string[]>({
    reducer: (x, y) => (x ?? []).concat(y ?? []),
    default: () => [],
  }),

  // Event details
  eventType: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  eventDate: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  servingTime: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  guestCount: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),
  deliveryLocation: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  dietaryPreference: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  // Menu selection & pricing
  selectedPackageId: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  selectedItems: Annotation<CateringOrderItem[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
  estimatedTotal: Annotation<number>({
    reducer: (x, y) => y ?? x,
    default: () => 0,
  }),

  // Workflow flags
  isConfirmed: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  humanHandoffRequired: Annotation<boolean>({
    reducer: (x, y) => y ?? x,
    default: () => false,
  }),
  handoffReason: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),

  // Bot response to send to customer
  replyMessage: Annotation<string>({
    reducer: (x, y) => y ?? x,
    default: () => '',
  }),
  interactiveButtons: Annotation<InteractiveButtonState[]>({
    reducer: (x, y) => y ?? x,
    default: () => [],
  }),
});

export type CateringStateType = typeof CateringStateAnnotation.State;
export type CateringStateUpdate = typeof CateringStateAnnotation.Update;

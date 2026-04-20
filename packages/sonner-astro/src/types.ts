export type ToastTypes =
  | 'normal'
  | 'action'
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'loading'
  | 'default';

export type Position =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-center'
  | 'bottom-center';

export type SwipeDirection = 'top' | 'right' | 'bottom' | 'left';

export type Theme = 'light' | 'dark' | 'system';

export type TitleT = string | HTMLElement | ((id: number | string) => HTMLElement | string);

export type PromiseT<Data = any> = Promise<Data> | (() => Promise<Data>);

export interface Action {
  label: string;
  onClick: (event: MouseEvent) => void;
  actionButtonStyle?: Partial<CSSStyleDeclaration>;
}

export interface ToastClassnames {
  toast?: string;
  title?: string;
  description?: string;
  loader?: string;
  closeButton?: string;
  cancelButton?: string;
  actionButton?: string;
  success?: string;
  error?: string;
  info?: string;
  warning?: string;
  loading?: string;
  default?: string;
  content?: string;
  icon?: string;
}

export interface ToastIcons {
  success?: string | HTMLElement;
  info?: string | HTMLElement;
  warning?: string | HTMLElement;
  error?: string | HTMLElement;
  loading?: string | HTMLElement;
  close?: string | HTMLElement;
}

export interface ToastT {
  id: number | string;
  toasterId?: string;
  title?: TitleT;
  type?: ToastTypes;
  icon?: string | HTMLElement;
  jsx?: HTMLElement | ((id: number | string) => HTMLElement);
  richColors?: boolean;
  invert?: boolean;
  closeButton?: boolean;
  dismissible?: boolean;
  description?: TitleT;
  duration?: number;
  delete?: boolean;
  action?: Action;
  cancel?: Action;
  onDismiss?: (toast: ToastT) => void;
  onAutoClose?: (toast: ToastT) => void;
  promise?: PromiseT;
  cancelButtonStyle?: Partial<CSSStyleDeclaration>;
  actionButtonStyle?: Partial<CSSStyleDeclaration>;
  style?: Partial<CSSStyleDeclaration>;
  unstyled?: boolean;
  className?: string;
  classNames?: ToastClassnames;
  descriptionClassName?: string;
  position?: Position;
  testId?: string;
}

export interface HeightT {
  height: number;
  toastId: number | string;
  position: Position;
}

export interface PromiseIExtendedResult extends ExternalToast {
  message: TitleT;
}

export type PromiseTExtendedResult<Data = any> =
  | PromiseIExtendedResult
  | ((data: Data) => PromiseIExtendedResult | Promise<PromiseIExtendedResult>);

export type PromiseTResult<Data = any> =
  | string
  | ((data: Data) => string | Promise<string>);

export type PromiseExternalToast = Omit<ExternalToast, 'description'>;

export type PromiseData<ToastData = any> = PromiseExternalToast & {
  loading?: string;
  success?: PromiseTResult<ToastData> | PromiseTExtendedResult<ToastData>;
  error?: PromiseTResult | PromiseTExtendedResult;
  description?: PromiseTResult;
  finally?: () => void | Promise<void>;
};

export interface ToastToDismiss {
  id: number | string;
  dismiss: boolean;
}

export type ExternalToast = Omit<ToastT, 'id' | 'type' | 'title' | 'jsx' | 'delete' | 'promise'> & {
  id?: number | string;
  toasterId?: string;
};

interface ToastOptions {
  className?: string;
  closeButton?: boolean;
  descriptionClassName?: string;
  style?: Partial<CSSStyleDeclaration>;
  cancelButtonStyle?: Partial<CSSStyleDeclaration>;
  actionButtonStyle?: Partial<CSSStyleDeclaration>;
  duration?: number;
  unstyled?: boolean;
  classNames?: ToastClassnames;
  closeButtonAriaLabel?: string;
  toasterId?: string;
}

type Offset =
  | {
      top?: string | number;
      right?: string | number;
      bottom?: string | number;
      left?: string | number;
    }
  | string
  | number;

export interface ToasterProps {
  id?: string;
  invert?: boolean;
  theme?: 'light' | 'dark' | 'system';
  position?: Position;
  hotkey?: string[];
  richColors?: boolean;
  expand?: boolean;
  duration?: number;
  gap?: number;
  visibleToasts?: number;
  closeButton?: boolean;
  toastOptions?: ToastOptions;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
  offset?: Offset;
  mobileOffset?: Offset;
  dir?: 'rtl' | 'ltr' | 'auto';
  swipeDirections?: SwipeDirection[];
  icons?: ToastIcons;
  customAriaLabel?: string;
  containerAriaLabel?: string;
}

export function isAction(action: any): action is Action {
  return action && typeof action === 'object' && typeof action.label !== 'undefined' && typeof action.onClick === 'function';
}

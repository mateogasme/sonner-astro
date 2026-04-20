import type {
  ExternalToast,
  PromiseData,
  PromiseIExtendedResult,
  PromiseT,
  ToastT,
  ToastToDismiss,
  ToastTypes,
  TitleT,
} from './types';

let toastsCounter = 1;

class Observer {
  subscribers: Array<(toast: ToastT | ToastToDismiss) => void>;
  toasts: Array<ToastT | ToastToDismiss>;
  dismissedToasts: Set<string | number>;

  constructor() {
    this.subscribers = [];
    this.toasts = [];
    this.dismissedToasts = new Set();
  }

  subscribe = (subscriber: (toast: ToastT | ToastToDismiss) => void) => {
    this.subscribers.push(subscriber);
    return () => {
      const index = this.subscribers.indexOf(subscriber);
      this.subscribers.splice(index, 1);
    };
  };

  publish = (data: ToastT) => {
    this.subscribers.forEach((subscriber) => subscriber(data));
  };

  addToast = (data: ToastT) => {
    this.publish(data);
    this.toasts = [...this.toasts, data];
  };

  create = (
    data: ExternalToast & {
      message?: TitleT;
      type?: ToastTypes;
      promise?: PromiseT;
      jsx?: HTMLElement | ((id: number | string) => HTMLElement);
    },
  ): string | number => {
    const { message, ...rest } = data;
    const id =
      typeof data?.id === 'number' || (data.id && String(data.id).length > 0)
        ? (data.id as number | string)
        : toastsCounter++;
    const alreadyExists = this.toasts.find((toast) => toast.id === id);
    const dismissible = data.dismissible === undefined ? true : data.dismissible;

    if (this.dismissedToasts.has(id)) {
      this.dismissedToasts.delete(id);
    }

    if (alreadyExists) {
      this.toasts = this.toasts.map((toast) => {
        if (toast.id === id) {
          this.publish({ ...(toast as ToastT), ...data, id, title: message });
          return {
            ...(toast as ToastT),
            ...data,
            id,
            dismissible,
            title: message,
          } as ToastT;
        }
        return toast;
      });
    } else {
      this.addToast({ title: message, ...rest, dismissible, id } as ToastT);
    }

    return id;
  };

  dismiss = (id?: number | string) => {
    if (id) {
      this.dismissedToasts.add(id);
      requestAnimationFrame(() =>
        this.subscribers.forEach((subscriber) => subscriber({ id, dismiss: true })),
      );
    } else {
      this.toasts.forEach((toast) => {
        this.subscribers.forEach((subscriber) => subscriber({ id: toast.id, dismiss: true }));
      });
    }
    return id;
  };

  message = (message: TitleT, data?: ExternalToast) => this.create({ ...data, message });
  error = (message: TitleT, data?: ExternalToast) => this.create({ ...data, message, type: 'error' });
  success = (message: TitleT, data?: ExternalToast) => this.create({ ...data, type: 'success', message });
  info = (message: TitleT, data?: ExternalToast) => this.create({ ...data, type: 'info', message });
  warning = (message: TitleT, data?: ExternalToast) => this.create({ ...data, type: 'warning', message });
  loading = (message: TitleT, data?: ExternalToast) => this.create({ ...data, type: 'loading', message });

  promise = <ToastData>(promise: PromiseT<ToastData>, data?: PromiseData<ToastData>) => {
    if (!data) return;

    let id: string | number | undefined = undefined;
    if (data.loading !== undefined) {
      id = this.create({
        ...data,
        promise,
        type: 'loading',
        message: data.loading,
        description: typeof data.description !== 'function' ? data.description : undefined,
      });
    }

    const p = Promise.resolve(promise instanceof Function ? (promise as () => Promise<ToastData>)() : promise);

    let shouldDismiss = id !== undefined;
    let result: ['resolve', ToastData] | ['reject', unknown];

    const originalPromise = p
      .then(async (response) => {
        result = ['resolve', response];
        if (isHttpResponse(response) && !response.ok) {
          shouldDismiss = false;
          const promiseData =
            typeof data.error === 'function'
              ? await (data.error as any)(`HTTP error! status: ${response.status}`)
              : data.error;
          const description =
            typeof data.description === 'function'
              ? await (data.description as any)(`HTTP error! status: ${response.status}`)
              : data.description;
          const isExtendedResult = typeof promiseData === 'object';
          const toastSettings: PromiseIExtendedResult = isExtendedResult
            ? (promiseData as PromiseIExtendedResult)
            : ({ message: promiseData } as PromiseIExtendedResult);
          this.create({ id, type: 'error', description, ...toastSettings });
        } else if (response instanceof Error) {
          shouldDismiss = false;
          const promiseData = typeof data.error === 'function' ? await (data.error as any)(response) : data.error;
          const description =
            typeof data.description === 'function' ? await (data.description as any)(response) : data.description;
          const isExtendedResult = typeof promiseData === 'object';
          const toastSettings: PromiseIExtendedResult = isExtendedResult
            ? (promiseData as PromiseIExtendedResult)
            : ({ message: promiseData } as PromiseIExtendedResult);
          this.create({ id, type: 'error', description, ...toastSettings });
        } else if (data.success !== undefined) {
          shouldDismiss = false;
          const promiseData = typeof data.success === 'function' ? await (data.success as any)(response) : data.success;
          const description =
            typeof data.description === 'function' ? await (data.description as any)(response) : data.description;
          const isExtendedResult = typeof promiseData === 'object';
          const toastSettings: PromiseIExtendedResult = isExtendedResult
            ? (promiseData as PromiseIExtendedResult)
            : ({ message: promiseData } as PromiseIExtendedResult);
          this.create({ id, type: 'success', description, ...toastSettings });
        }
      })
      .catch(async (error) => {
        result = ['reject', error];
        if (data.error !== undefined) {
          shouldDismiss = false;
          const promiseData = typeof data.error === 'function' ? await (data.error as any)(error) : data.error;
          const description =
            typeof data.description === 'function' ? await (data.description as any)(error) : data.description;
          const isExtendedResult = typeof promiseData === 'object';
          const toastSettings: PromiseIExtendedResult = isExtendedResult
            ? (promiseData as PromiseIExtendedResult)
            : ({ message: promiseData } as PromiseIExtendedResult);
          this.create({ id, type: 'error', description, ...toastSettings });
        }
      })
      .finally(() => {
        if (shouldDismiss) {
          this.dismiss(id);
          id = undefined;
        }
        data.finally?.();
      });

    const unwrap = () =>
      new Promise<ToastData>((resolve, reject) =>
        originalPromise.then(() => (result[0] === 'reject' ? reject(result[1]) : resolve(result[1]))).catch(reject),
      );

    if (typeof id !== 'string' && typeof id !== 'number') {
      return { unwrap };
    } else {
      return Object.assign(id as any, { unwrap });
    }
  };

  custom = (jsx: (id: number | string) => HTMLElement, data?: ExternalToast) => {
    const id = data?.id || toastsCounter++;
    this.create({ jsx, ...data, id });
    return id;
  };

  getActiveToasts = () => {
    return this.toasts.filter((toast) => !this.dismissedToasts.has(toast.id)) as ToastT[];
  };
}

export const ToastState = new Observer();

const toastFunction = (message: TitleT, data?: ExternalToast) => {
  const id = data?.id || toastsCounter++;
  ToastState.addToast({ title: message, ...data, id } as ToastT);
  return id;
};

const isHttpResponse = (data: any): data is Response => {
  return (
    data &&
    typeof data === 'object' &&
    'ok' in data &&
    typeof data.ok === 'boolean' &&
    'status' in data &&
    typeof data.status === 'number'
  );
};

const basicToast = toastFunction;

const getHistory = () => ToastState.toasts;
const getToasts = () => ToastState.getActiveToasts();

export const toast = Object.assign(
  basicToast,
  {
    success: ToastState.success,
    info: ToastState.info,
    warning: ToastState.warning,
    error: ToastState.error,
    custom: ToastState.custom,
    message: ToastState.message,
    promise: ToastState.promise,
    dismiss: ToastState.dismiss,
    loading: ToastState.loading,
  },
  { getHistory, getToasts },
);

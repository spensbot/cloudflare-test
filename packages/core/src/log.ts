export namespace Log {
  export function error(...args: any[]) {
    console.error(...args)
  }

  export function warn(...args: any[]) {
    console.warn(...args)
  }

  export function info(...args: any[]) {
    console.info(...args)
  }

  export function temp(...args: any[]) {
    console.debug(...args)
  }

  export function tempJson(lable: string, object: any) {
    console.debug(lable, JSON.stringify(object, null, 2))
  }
}
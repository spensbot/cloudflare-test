export namespace Log {
  export function debug(...args: any[]) {
    console.debug(...args)
  }

  export function debugJson(lable: string, object: any) {
    console.debug(lable, JSON.stringify(object, null, 2))
  }
}
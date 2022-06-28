export type TwitterCodeState = {
  code: string,
  state: string
}

export default class TwitterState {

  private static _instance: TwitterState

  private codeMap = new Map()

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  public getCode(state: string) : TwitterCodeState {
    const result = this.codeMap.get(state)
    this.codeMap.delete(state)
    return result 
  }

  public setCode(state: string, code: string) {
    this.codeMap.set(state, { state, code })

    return this.codeMap.has(state)
  }

}
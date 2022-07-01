export type TwitterCodeState = {
  code: string,
  state: string,
  user: number
}

export default class TwitterState {

  private static _instance: TwitterState

  private codeMap = new Map()

  // TODO: add setTimeout to clean codeStates running

  public static get Instance() {
    return this._instance || (this._instance = new this());
  }

  public getCode(state: string) : TwitterCodeState {
    const result = this.codeMap.get(state)
    this.codeMap.delete(state)
    return result 
  }

  public setCode(data: TwitterCodeState) {
    this.codeMap.set(data.state, data)

    return this.codeMap.has(data.state)
  }

}
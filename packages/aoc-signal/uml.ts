interface SignalService {
    constructor(cfg:SignalConfig):void
    login(clientId: string, callbacks: object): Promise
    joinRoom(roomProps: object, callbacks: object): Promise<Room>
    leaveRoom(name: string): Promise
}

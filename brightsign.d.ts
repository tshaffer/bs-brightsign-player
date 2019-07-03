declare module '@brightsign/assetpool' {

  export interface Hash {
    method: string;
    hex: string;
  }
  
  export interface Authentication {
    user: string;
    password: string;
  }
  
  export interface Header {
    name: string;
    value: string;
  }
  
  export interface Asset {
    name: string;
    link: string;
    size?: number;
    hash?: Hash;
    changeHint: string;
    auth?: Authentication;
    headers?: Header[];
    probe?: string;
  }
  
  export interface ValidationOptions {
    deleteCorruptFiles: boolean;
  }
  
  export interface ValidationResultList {
    name: string;
    ok: boolean;
    reason: string;
  }
  
  export interface QueryResultAssetList {
    name: string;
    present: boolean;
  }

  export default class AssetPool {
    constructor(path: string);
    protectAssets(name: string, assets: Asset[]): Promise<void>;
    unprotectAssets(name: string): Promise<void>;
    reserveStorage(size: number): Promise<void>;
    setMaximumPoolSize(size: number): Promise<void>;
    getPoolSize(): Promise<number>;
    validate(assets: Asset[], options: ValidationOptions): Promise<ValidationResultList>;
    queryFiles(assets: Asset[]): Promise<QueryResultAssetList>;
    areAssetsReady(assets: Asset[]): Promise<boolean>;
  }
}

declare module '@brightsign/assetpoolfetcher' {
  import AssetPool, {Asset, Hash} from '@brightsign/assetpool';
  export { AssetPool, Asset, Hash }

  export interface FileEvent extends Event {
    fileName: string;
    index: number;
    responseCode: number;
    error: string;
  }
 
  export interface ProgressEvent extends Event {
    fileName: string;
    index: number;
    total: number;
    currentFileTransferred: number;
    currentFileTotal: number;
  }

  export interface Authentication {
    username: string;
    password: string;
  }

  export interface Header {
    name: string;
    value: string;
  }
  
  export interface MinTransferRate {
    bytesPerSecond: number;
    periodInSeconds: number;
  }
 
  export interface AssetPoolFetcherParams {
    auth: Authentication;
    enableUnsafeAuthentication: boolean;
    enableUnsafeProxyAuthentication: boolean;
    enableEncodings: boolean;
    enablePeerVerification: boolean;
    enableHostVerification: boolean;
    certificatesFile: string;
    headers: Header[];
    proxy: string;
    proxyBypassList: string[];
    progressInterval: number;
    fileRetryCount: number;
    relativeLinkPrefix: string;
    interfaceName: string;
    minimumTransferRate: MinTransferRate;
    maximumTransferRate: number;
    onlyRequestCache: boolean;
  }

  export default class AssetPoolFetcher {
    fileevent: EventListener;
    progressevent: EventListener;
    constructor(pool: AssetPool);
    start(list: Asset[], assetPoolParams?: AssetPoolFetcherParams): Promise<void> 
    cancel(): Promise<void> ;
  }
}

declare module '@brightsign/assetrealizer' {
  import AssetPool, {Asset, Hash} from '@brightsign/assetpool';
  export { AssetPool, Asset, Hash }

  export interface FailureReason {
    name: string;
    ok: boolean;
    reason: string;
  }

  export default class AssetRealizer {
    constructor(assetPool: AssetPool, path: string);
    estimateRealizedSize(assets: Asset[]): Promise<number>;
    realize(assets: Asset[]): Promise<FailureReason>;
    validateFiles(assets: Asset[], options: string[]): Promise<string>;
  }
}

declare module '@brightsign/compositor' {
  export default class Compositor {
    pause(timeoutMs: number): void;
    resume(): void;
    getCrc(): number;
  }
}

declare module '@brightsign/decoderconfiguration' {

  export interface DecoderConfigWritable {
    name: string;
    friendlyName: string;
    configuredSize: string;
    zIndex: number;
    mosaicDeinterlace: boolean;
  }
  
  export interface DecoderConfig extends DecoderConfigWritable {
    maxSize: string;
    mode: string;
    usageCount: number;
    maxUsage: number;
  }

  export default class DecoderConfiguration {
    getConfig(): Promise<DecoderConfig[]>;
    applyConfig(config: DecoderConfig[]): Promise<void>;
  }
}

declare module '@brightsign/dwsconfiguration' {
  
  export interface Password {
    value: string;
    obfuscated: boolean;
  }
 
  export interface DWSConfig {
    port: number;
    password: Password;
    authenticationList: string[];
  }
 
  export interface DWSConfigWritable extends DWSConfig {
    password: Password;
  }
 
  export interface DWSResult {
    restartRequired: boolean;
  }

  export default class DWSConfiguration {
    defaultConfig(): DWSConfig;
    getConfig(): Promise<DWSConfig>;
    applyConfig(config: DWSConfigWritable): Promise<DWSResult>;
  }
}

declare module '@brightsign/filesysteminfo' {

  export interface StorageStats {
    blockSize: number;
    bytesFree: number;
    sizeBytes: number;
    filesFree: number;
    filesUsed: number;
    isReadOnly: boolean;
}

  export default class FileSystemInfo {
    constructor(path: string);
    isReadOnly(): Promise<boolean>;
    getFilesystemType(): Promise<string>;
    getStatistics(): Promise<StorageStats>;
  }
}

declare module '@brightsign/hostconfiguration' {

  export interface HostConfig {
    proxy: string;
    translatedProxy: string;
    proxyBypassList: string[];
    timeServerList: string[];
    timeServerInterval: number;
    hostName: string;
  }
  
  export interface HostWriteableConfig extends HostConfig {
    loginPassword: string;
    obfuscatedLoginPassword: string;
  }
  
  export default class HostConfiguration {
    defaultConfig(): HostConfig;
    getConfig(): Promise<HostConfig>;
    applyConfig(config: HostWriteableConfig): Promise<void>;
  }
}

declare module '@brightsign/keyboard' {

  export default class Keyboard {
    isAttached(): Promise<boolean>;
    setLayout(layoutName: string): Promise<void>;
  }
}

declare module '@brightsign/keystore' {

  export interface ClientCertificateObject {
    certificateFile: string;
    passphrase: string;
    obfuscatedPassphrase: string;
  }

  export interface Package {
    // TODO
  }

  export default class KeyStore {
    addCaCertificate(filename: string): Promise<void>;
    addCaPackage(filename: string): Promise<void>;
    addClientCertificate(object: ClientCertificateObject): Promise<void>;
    removeCaPackage(filename: string): Promise<void>;
    getCaPackagesInstalled(): Promise<Package[]>;
  }
}

declare module '@brightsign/networkconfiguration' {

  export interface WifiAccessPointList {
    essId: string;
    bssId: string;
    signal: number;
  }
 
  export interface LLDPNeighborInformation {
    // Information is directly converted from LLDP.
  }

  export interface DHCPServerConfig {
    start: string;
    end: string;
  }
 
  export interface IPAddress {
    family: string;
    address: string;
    netmask: string;
    gateway: string;
    broadcast: string;
  }
 
  export interface NetworkInterfaceConfig {
    metric: number;
    dhcpServerConfig?: DHCPServerConfig;
    dnsServerList: string[];
    ipAddressList: IPAddress[];
    enabledProtocolList: string[];
    inboundShaperRate: number;
    mtu: number;
    vlanIdList?: number[];
    clientIdentifier: string;
    domain: string;
  }
 
  export interface ModemInterfaceConfig extends NetworkInterfaceConfig {
    user: string;
    password: string;
    number: string;
    initString: string;
  }
 
  export interface EthernetInterfaceConfig extends NetworkInterfaceConfig {
    securityMode: string;
    identity: string;
    eapTlsOptions: string;
    caCertificates: string;
    clientCertificate: string;
    privateKey: string;
  }
 
  export interface WifiInterfaceConfig extends NetworkInterfaceConfig {
    essId: string;
    passphrase: string;
    obfuscatedPassphrase: string;
    country: string;
    securityMode: string;
    identity: string;
    eapTlsOptions: string;
    caCertificates: string;
    clientCertificate: string;
    privateKey: string;
    accessPointMode?: boolean;
    accessPointFrequency?: number;
  }

  export default class NetworkConfiguration {
    type: string;
    defaultConfig(): NetworkInterfaceConfig;
    getConfig(): Promise<WifiInterfaceConfig | ModemInterfaceConfig | EthernetInterfaceConfig>;
    applyConfig(config: NetworkInterfaceConfig): Promise<void> ;
    getNeighborInformation(): Promise<LLDPNeighborInformation>; // if eth0
    enableLeds(): Promise<void>; // if eth0
    scan(): Promise <WifiAccessPointList>; // if wlan0
  }
}

declare module '@brightsign/networkdiagnostics' {

  export interface Log {
    name: string;
    pass: string;
    result: string;
    info: string[];
  }

  export interface InterfaceTestResult {
    diagnosis: string;
    ok: boolean;
    log: Log[];
  }

  export default class NetworkDiagnostics {
    testInternetConnectivity(): Promise<InterfaceTestResult>;
    testNetworkInterface(interfaceName: string): Promise<InterfaceTestResult>;
  }
}

declare module '@brightsign/pointer' {

  export default class Pointer {
    isMousePresent(): Promise<boolean>;
    isMultiTouchPresent(): Promise<boolean>;
  }
}

declare module '@brightsign/pointercalibration' {

  export default class PointerCalibration {
    startCalibration(): Promise<void>;
    getCalibrationStatus(): Promise<number>;
    setCalibrationRanges(xMin: number, xMax: number, yMin: number, yMax: number): Promise<void>;
    clearStoredCalibration(): Promise<boolean>;
    isCalibrated(): Promise<boolean>;
    getDiagnosticInfoHTML(deviceInfo: boolean, events: boolean): Promise<string>;
    startEventLogging(): Promise<void>;
    stopEventLogging(): Promise<void>;
  }
}

declare module '@brightsign/registry' {

  export default class Registry {
    read(sectionName?: string, key?: string): Promise <string | object>;
    write(sectionName?: string, key?: string, value?: string): Promise <void>;
  }
}

declare module '@brightsign/screenshot' {
  
  export interface ScreenshotParams {
    fileName: string;
    fileType?: string;
    description?: string;
    width?: number;
    height?: number;
    quality?: number;
    rotation?: number;
  }

  export default class Screenshot {
    syncCapture(params: ScreenshotParams): void;
    asyncCapture(params: ScreenshotParams): Promise<void>;
  }
}

declare module '@brightsign/storageinfo' {
  
  export interface StorageDeviceInfo {
    size: number;
    productName?: string;
    oemID?: string;
    auSize?: number;
    productRev?: string;
    mfrDate?: string;
    mfrID?: number;
    serial?: string;
    signalVoltage?: string;
    uhsMode?: string;
    specVersion?: number;
    speedClass?: string;
    sataModel?: string;
    sataVendor?: string;
}

  export default class StorageInfo {
    constructor(path: string);
    getDeviceSize(): Promise<number>;
    getDeviceInfo(): Promise<StorageDeviceInfo>;
  }
}

declare module '@brightsign/system' {
  
  export interface Size {
    height: number;
    width: number;
}

  export default class System {
    reboot(): void;
    setImageSizeThreshold(size: Size): Promise<void>;
  }
}

declare module '@brightsign/systemtime' {
  
  export interface LastNetworkTimeResult {
    readonly successTimestamp: number;
    readonly attemptTimestamp: number;
    readonly failureReason: string;
 }
  
 export interface NetworkTimeEvent extends Event {
    readonly success: boolean;
    readonly reason: string;
 }

  export default class SystemTime extends EventTarget {
    networktimeevent: Event;
    setDate(date: Date): Promise<void>;
    setTimeZone(timezoneString: string): Promise<void>; // requires reboot
    lastNetworkTimeResult(): LastNetworkTimeResult;
 }
}

declare module '@brightsign/videoinput' {

  export interface VideoInputConfig {
    enableAc3: boolean;
    enableEac3: boolean;
    enableTrueHdMlp: boolean;
    enableDts: boolean;
    enableDtsHd: boolean;
    maxSampleRate: number;
    maxChannelCount: number;
    lockAudioTo: string;
  }
 
  export interface Status {
    rebootRequired: boolean;
  }

  export interface HdmiInputStatus {
    devicePresent: boolean;
    width: number;
    height: number;
    interlaced: boolean;
    frameRate: number;
    pixelClock: number;
    colorSpace: string;
    audioType: string;
    audioSamplingRate: number;
  }

  export default class VideoInput extends EventTarget {
    hdmiinputchanged: Event;
    defaultConfig(): VideoInputConfig;
    getConfig(): Promise<VideoInputConfig>;
    applyConfig(config: VideoInputConfig): Promise<Status>;
    getStatus(): Promise<HdmiInputStatus>;
  }
}

declare module '@brightsign/videomodeconfiguration' {
  export interface Mode {
    modeName: string;
    colorSpace: string;
    colorDepth: string;
    frequency: number;
    dropFrame: boolean;
    width: number;
    height: number;
    graphicsPlaneHeight: number;
    graphicsPlaneWidth: number;
    preferred: boolean;
    interlaced: boolean;
    overscan: boolean;
  }
 
  export interface SetModeResult {
    restartRequired: boolean;
  }

  export default class VideoMode {
    getAvailableModes(): Promise<Mode[]>;
    getBestMode(connector: string): Promise<string>;
    getActiveMode(): Promise<Mode>;
    getConfiguredMode(): Promise<Mode>;
    setMode(mode: Mode): Promise<SetModeResult>;
  }
}

declare module '@brightsign/videooutput' {
 
  export interface EdidIdentity {
    manufacturer: string;
    product: number;
    serialNumber: number;
    weekOfManufacture: number;
    yearOfManufacture: number;
    monitorName: string;
    textString: string;
    serialNumberString: string
    bt2020RgbSupport: boolean;
    bt2020YccSupport: boolean;
    sdrEotfSupport: boolean;
    hdrEotfSupport: boolean;
    hdrSt2084Support: boolean;
    unstable: boolean;
  }
 
  export interface OutputStatus {
    outputPresent: boolean;
    outputPowered: boolean;
    unstable: boolean;
    audioFormat: string;
    audioSampleRate: number;
    audioBitsPerSample: number;
    audioChannelCount: number;
    eotf: string;
  }
 
  export interface Size {
    width: number;
    height: number;
  }
 
  export interface ColorProperties {
    constrast: number;
    saturation: number;
    hue: number;
    brightness: number;
  }
 
 
  export interface TxHdcpStatus {
    state: string;
  }

   export default class VideoOutput extends EventTarget {
    type: string;
    hotplugevent: Event;
    constructor (interfaceName: string);
    getVideoResolution(): Promise<Size>;
    getGraphicsResolution(): Promise<Size>;
    getOutputResolution(): Promise<Size>;
    adjustGraphicsColor(colorProperties: ColorProperties): Promise<void>;
    getEdidIdentity(): Promise<EdidIdentity>;
    getEdid(): Promise<string>;
    setMultiScreenBezel(xPercentage: number, yPercentage: number): Promise<void>;
    setBackgroundColor(color: number): Promise<void>;
    setPowerSaveMode(enable: boolean): Promise<void>;
    set3dMode(mode: number): Promise<void>;
    setSyncDomain(domain: string): Promise<void>;
    isAttached(): Promise<boolean>;
    getOutputStatus(): Promise<OutputStatus>; // if type === hdmi
    disableAudio(disable: boolean): Promise<void>; // if type === hdmi
    getTxHdcpStatus(): Promise<TxHdcpStatus>; // if type === hdmi
    forceHdcpOn(forceHdcpOn: boolean): Promise<void>; // if type === hdmi
  }
}
declare module '@brightsign' {
  global {

    export class BSMessagePort {
      onbsmessage: (message: {data: any}) => void;
      PostBSMessage(message: object): void;
    }

    export class BSControlPort {
      constructor(portName: string);
      SetPinValue(button: number, output: number): void;
      oncontroldown(event: any): void;
    }
  }
}

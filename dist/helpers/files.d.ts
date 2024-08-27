export declare enum File {
    HOSTS = "/etc/hosts"
}
export declare const currentPath: () => string;
export declare function fileExists(location: string): boolean;
export declare function writeToFile(file: File, content: string): Promise<void>;

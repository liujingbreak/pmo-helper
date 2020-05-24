import pup from 'puppeteer-core';
export declare function login(): Promise<void>;
export declare function launch(headless?: boolean): Promise<pup.Browser>;
export declare function main(): void;
export declare function isVisible(el: pup.ElementHandle): Promise<boolean>;
export declare function waitForVisible(el: pup.ElementHandle, visible?: boolean, timeout?: number): Promise<void>;

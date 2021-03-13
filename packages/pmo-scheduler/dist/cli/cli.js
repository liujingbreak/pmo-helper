"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const cliExt = (program) => {
    program.command('fetch-ss-addr [subscribe-url]')
        .description('Fetch Shadowsocks server address', {
        'subscribe-url': 'URL address of server address subscription'
    })
        // .option('-f, --file <spec>', 'sample option')
        .action((sub) => __awaiter(void 0, void 0, void 0, function* () {
        yield (yield Promise.resolve().then(() => __importStar(require('./cli-fetch-ss-addr')))).fetchSsAddr(sub);
    }));
    // TODO: Add more sub command here
};
exports.default = cliExt;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiY2xpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUVBLE1BQU0sTUFBTSxHQUFpQixDQUFDLE9BQU8sRUFBRSxFQUFFO0lBQ3ZDLE9BQU8sQ0FBQyxPQUFPLENBQUMsK0JBQStCLENBQUM7U0FDL0MsV0FBVyxDQUFDLGtDQUFrQyxFQUFFO1FBQy9DLGVBQWUsRUFBRSw0Q0FBNEM7S0FDOUQsQ0FBQztRQUNGLGdEQUFnRDtTQUMvQyxNQUFNLENBQUMsQ0FBTyxHQUFZLEVBQUUsRUFBRTtRQUM3QixNQUFNLENBQUMsd0RBQWEscUJBQXFCLEdBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUMvRCxDQUFDLENBQUEsQ0FBQyxDQUFDO0lBRUgsa0NBQWtDO0FBQ3BDLENBQUMsQ0FBQztBQUVGLGtCQUFlLE1BQU0sQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7Q2xpRXh0ZW5zaW9ufSBmcm9tICdAd2ZoL3BsaW5rL3dmaC9kaXN0JztcblxuY29uc3QgY2xpRXh0OiBDbGlFeHRlbnNpb24gPSAocHJvZ3JhbSkgPT4ge1xuICBwcm9ncmFtLmNvbW1hbmQoJ2ZldGNoLXNzLWFkZHIgW3N1YnNjcmliZS11cmxdJylcbiAgLmRlc2NyaXB0aW9uKCdGZXRjaCBTaGFkb3dzb2NrcyBzZXJ2ZXIgYWRkcmVzcycsIHtcbiAgICAnc3Vic2NyaWJlLXVybCc6ICdVUkwgYWRkcmVzcyBvZiBzZXJ2ZXIgYWRkcmVzcyBzdWJzY3JpcHRpb24nXG4gIH0pXG4gIC8vIC5vcHRpb24oJy1mLCAtLWZpbGUgPHNwZWM+JywgJ3NhbXBsZSBvcHRpb24nKVxuICAuYWN0aW9uKGFzeW5jIChzdWI/OiBzdHJpbmcpID0+IHtcbiAgICBhd2FpdCAoYXdhaXQgaW1wb3J0KCcuL2NsaS1mZXRjaC1zcy1hZGRyJykpLmZldGNoU3NBZGRyKHN1Yik7XG4gIH0pO1xuXG4gIC8vIFRPRE86IEFkZCBtb3JlIHN1YiBjb21tYW5kIGhlcmVcbn07XG5cbmV4cG9ydCBkZWZhdWx0IGNsaUV4dDtcbiJdfQ==
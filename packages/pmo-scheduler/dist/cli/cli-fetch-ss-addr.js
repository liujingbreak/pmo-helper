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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchSsAddr = void 0;
// import {config} from '@wfh/plink';
const __plink_1 = __importDefault(require("__plink"));
const axios_observable_1 = __importDefault(require("axios-observable"));
const op = __importStar(require("rxjs/operators"));
// Chalk is useful for printing colorful text in a terminal
// import chalk from 'chalk';
function fetchSsAddr(subscribeUrl = 'https://sub.duang.cloud/api/v1/client/subscribe?token=545e10155e1fbd17c5b7dda4ce8b3728') {
    return __awaiter(this, void 0, void 0, function* () {
        axios_observable_1.default.get(subscribeUrl).pipe(op.tap(res => {
            const buf = Buffer.from(res.data, 'base64');
            // tslint:disable-next-line no-console
            console.log(buf.toString('utf-8'));
        }), op.catchError((err, src) => {
            __plink_1.default.logger.error(err);
            return err;
        })).subscribe();
    });
}
exports.fetchSsAddr = fetchSsAddr;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpLWZldGNoLXNzLWFkZHIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGktZmV0Y2gtc3MtYWRkci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEscUNBQXFDO0FBQ3JDLHNEQUE0QjtBQUM1Qix3RUFBcUM7QUFDckMsbURBQXFDO0FBQ3JDLDJEQUEyRDtBQUMzRCw2QkFBNkI7QUFFN0IsU0FBc0IsV0FBVyxDQUFDLFlBQVksR0FBRyx3RkFBd0Y7O1FBQ3ZJLDBCQUFLLENBQUMsR0FBRyxDQUFTLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FDbEMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNYLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQztZQUM1QyxzQ0FBc0M7WUFDdEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLEVBQ0YsRUFBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN6QixpQkFBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDeEIsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDLENBQUMsQ0FDSCxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ2hCLENBQUM7Q0FBQTtBQVpELGtDQVlDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gaW1wb3J0IHtjb25maWd9IGZyb20gJ0B3ZmgvcGxpbmsnO1xuaW1wb3J0IHBsaW5rIGZyb20gJ19fcGxpbmsnO1xuaW1wb3J0IGF4aW9zIGZyb20gJ2F4aW9zLW9ic2VydmFibGUnO1xuaW1wb3J0ICogYXMgb3AgZnJvbSAncnhqcy9vcGVyYXRvcnMnO1xuLy8gQ2hhbGsgaXMgdXNlZnVsIGZvciBwcmludGluZyBjb2xvcmZ1bCB0ZXh0IGluIGEgdGVybWluYWxcbi8vIGltcG9ydCBjaGFsayBmcm9tICdjaGFsayc7XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmZXRjaFNzQWRkcihzdWJzY3JpYmVVcmwgPSAnaHR0cHM6Ly9zdWIuZHVhbmcuY2xvdWQvYXBpL3YxL2NsaWVudC9zdWJzY3JpYmU/dG9rZW49NTQ1ZTEwMTU1ZTFmYmQxN2M1YjdkZGE0Y2U4YjM3MjgnKSB7XG4gIGF4aW9zLmdldDxzdHJpbmc+KHN1YnNjcmliZVVybCkucGlwZShcbiAgICBvcC50YXAocmVzID0+IHtcbiAgICAgIGNvbnN0IGJ1ZiA9IEJ1ZmZlci5mcm9tKHJlcy5kYXRhLCAnYmFzZTY0Jyk7XG4gICAgICAvLyB0c2xpbnQ6ZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgICAgY29uc29sZS5sb2coYnVmLnRvU3RyaW5nKCd1dGYtOCcpKTtcbiAgICB9KSxcbiAgICBvcC5jYXRjaEVycm9yKChlcnIsIHNyYykgPT4ge1xuICAgICAgcGxpbmsubG9nZ2VyLmVycm9yKGVycik7XG4gICAgICByZXR1cm4gZXJyO1xuICAgIH0pXG4gICkuc3Vic2NyaWJlKCk7XG59XG4iXX0=
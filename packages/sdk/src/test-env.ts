import Environment from "jest-environment-jsdom";
import util from "util";
import { fn } from "jest-mock";

class CustomTestEnvironment extends Environment {
  async setup() {
    await super.setup();
    if (typeof this.global.TextEncoder === "undefined") {
      const { TextEncoder, TextDecoder } = util;
      this.global.TextEncoder = TextEncoder;
      (this.global as any).TextDecoder = TextDecoder;
    }

    /**
     * Monkeypatch JSDOM file input to allow modification (this is a thing in the browser but
     * not in JSDOM for some reason.)
     */
    const fileCache = new WeakMap();

    Object.defineProperty(this.global.HTMLInputElement.prototype, "files", {
      set(fileList) {
        // use the input itself as the map key to avoid collisions
        fileCache.set(this, fileList);

        // the first time we set install a new set of getter/setter that point to the cache
        Object.defineProperty(this, "files", {
          get() {
            return fileCache.get(this);
          },
          set(value) {
            fileCache.set(this, value);
          },
        });
      },
    });

    /**
     * This is not implemented in JSDOM; creating a minimal mock.
     */
    const globalDocument = this.global.document;
    (this.global as any).DataTransfer = class DataTransfer {
      items: any;
      files: any;

      constructor() {
        const dummyInput = globalDocument.createElement("input");
        dummyInput.type = "file";

        /**
         * You can't construct a FileList, so we have to steal one.
         */
        const fileList = dummyInput.files || {};
        const arr: File[] = [];

        /**
         * Bolt on DataTransferItemList things so we can manipulate and reuse it.
         */
        const fileListProxy = new Proxy(fileList, {
          get(target, prop, receiver) {
            if (prop === "add") {
              return (x: File) => {
                arr.push(x);
              };
            } else if (prop === "length") {
              return arr.length;
            } else if (arr[Number(prop)]) {
              return arr[Number(prop)];
            }

            return Reflect.get(...[target, prop, receiver]);
          },
        });

        this.items = fileListProxy;
        this.files = fileListProxy;
      }
    };

    Object.defineProperty(URL, "createObjectURL", {
      value: fn(
        (file) =>
          `http://localhost/${Buffer.from(file.name).toString("base64")}`
      ),
    });
  }
}

module.exports = CustomTestEnvironment;

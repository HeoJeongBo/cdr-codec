import { CdrDispatcher } from "./dispatcher";
import type { CdrWorkerRequest } from "./protocol";

const ctx = self as unknown as DedicatedWorkerGlobalScope;
const dispatcher = new CdrDispatcher();

ctx.onmessage = (event: MessageEvent<CdrWorkerRequest>) => {
  const outcome = dispatcher.handle(event.data);
  if (outcome.transfer && outcome.transfer.length > 0) {
    ctx.postMessage(outcome.response, [...outcome.transfer]);
  } else {
    ctx.postMessage(outcome.response);
  }
  if (event.data.type === "dispose") {
    ctx.close();
  }
};

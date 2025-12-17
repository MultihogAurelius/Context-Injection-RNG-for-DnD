
(function () {
  "use strict";

  const QUEUE_LEN = 20;

  function rollD20() {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    return (buf[0] % 20) + 1;
  }

  function makeQueue(n = QUEUE_LEN) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(rollD20());
    return out;
  }

  function buildRngBlock(queue) {
    const turnId = Date.now();
    return (
      "[RNG_QUEUE v1]\n" +
      `turn_id=${turnId}\n` +
      "scope=this_response\n" +
      `queue=${queue.join(",")}\n` +
      "rule=ABSOLUTE LAW: use in order. For rolls < d20 (e.g. damage), use value modulo die size.\n" +
      "[/RNG_QUEUE]\n\n"
    );
  }

  function isUserMessage(m) {
    if (!m) return false;
    if (m.role) return m.role === "user";
    if (typeof m.is_user === "boolean") return m.is_user === true;
    return false;
  }

  globalThis.rngQueueInterceptor = async function (chat, contextSize, abort, type) {
    let idx = -1;
    for (let i = chat.length - 1; i >= 0; i--) {
      if (isUserMessage(chat[i])) {
        idx = i;
        break;
      }
    }
    if (idx === -1) return;

    // DUPLICATE PROTECTION
    const msg = chat[idx];
    const contentToCheck = (typeof msg.content === 'string') ? msg.content : msg.mes;
    
    if (contentToCheck && contentToCheck.includes("[RNG_QUEUE v1]")) {
        return; 
    }

    const queue = makeQueue(QUEUE_LEN);
    const block = buildRngBlock(queue);
    const cloned = structuredClone(msg);

    if (typeof cloned.content === "string") cloned.content = block + cloned.content;
    if (typeof cloned.mes === "string") cloned.mes = block + cloned.mes;

    chat[idx] = cloned;
  };

})();

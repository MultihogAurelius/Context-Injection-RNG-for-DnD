(function () {
    "use strict";

    const QUEUE_LEN = 20;

    // ROLLBACK: Using d20 simplifies the mental model for the AI.
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
            "[RNG_QUEUE v2]\n" +
            `turn_id=${turnId}\n` +
            "scope=this_response\n" +
            `queue=[${queue.join(", ")}]\n` +
            // SIMPLIFIED INSTRUCTION: Explicitly maps the 1-20 range to avoid "Zero Damage" bugs.
            "rule=ABSOLUTE LAW: Use seeds in order (Index 0, then 1, then 2...). NEVER skip a seed.\n" +
            "  - For d20 rolls: Use the seed value directly.\n" +
            "  - For damage/other dice (d4, d6, d8...): Result = ((Seed - 1) % Die_Size) + 1.\n" +
            "    (Ex: Seed 12 on d6 -> (11 % 6) + 1 = 6)\n" +
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

        const msg = chat[idx];
        const contentToCheck = (typeof msg.content === 'string') ? msg.content : msg.mes;

        if (contentToCheck && contentToCheck.includes("[RNG_QUEUE v2]")) {
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


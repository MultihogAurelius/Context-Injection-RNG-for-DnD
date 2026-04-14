(function () {
    "use strict";

    const QUEUE_LEN = 8;

    /**
     * Generates a perfectly uniform random integer between 1 and 'sides'.
     * Uses rejection sampling to eliminate modulo bias.
     */
    function rollDie(sides) {
        const buf = new Uint32Array(1);
        // Calculate the largest multiple of 'sides' that fits in a 32-bit uint
        // 4294967296 is 2^32
        const limit = Math.floor(4294967296 / sides) * sides;
        
        let roll;
        do {
            crypto.getRandomValues(buf);
            roll = buf[0];
        } while (roll >= limit); // Discard values in the "biased" upper tail

        return (roll % sides) + 1;
    }

    /**
     * Creates a queue where every single die is rolled independently.
     * No more mathematical coupling!
     */
    function makeQueue(n = QUEUE_LEN) {
        const out = [];
        for (let i = 0; i < n; i++) {
            out.push({
                d20: rollDie(20),
                d4:  rollDie(4),
                d6:  rollDie(6),
                d8:  rollDie(8),
                d10: rollDie(10),
                d12: rollDie(12)
            });
        }
        return out;
    }

    function buildRngBlock(queue) {
        const turnId = Date.now();
        const formattedQueue = queue.map(dice => {
            return `${dice.d20}(d4:${dice.d4},d6:${dice.d6},d8:${dice.d8},d10:${dice.d10},d12:${dice.d12})`;
        }).join(", ");

        return (
            "[RNG_QUEUE v6.0_PROPER]\n" +
            `turn_id=${turnId}\n` +
            "scope=this_response\n" +
            `queue=[${formattedQueue}]\n` +
            "[/RNG_QUEUE]\n\n"
        );
    }

    // ... (rest of your logic for isUserMessage and rngQueueInterceptor remains the same)
    
    globalThis.rngQueueInterceptor = async function (chat, contextSize, abort, type) {
        let idx = -1;
        for (let i = chat.length - 1; i >= 0; i--) {
            if (chat[i].role === "user" || chat[i].is_user) {
                idx = i;
                break;
            }
        }

        if (idx === -1) return;

        const msg = chat[idx];
        const contentToCheck = msg.content || msg.mes;

        if (contentToCheck && contentToCheck.includes("[RNG_QUEUE v6.0_PROPER]")) return;

        const queue = makeQueue(QUEUE_LEN);
        const block = buildRngBlock(queue);
        const cloned = structuredClone(msg);

        if (typeof cloned.content === "string") cloned.content = block + cloned.content;
        else if (typeof cloned.mes === "string") cloned.mes = block + cloned.mes;

        chat[idx] = cloned;
    };
})();

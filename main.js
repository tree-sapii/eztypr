
class KeySim {
  script_id_uuid = ""

  injectScript(codeToInject) {
    if (!this.script_id_uuid) {
      const script = document.createElement('script');
      script.id = crypto.randomUUID();
      script.textContent = `(${codeToInject.toString()})();`;
      (document.head || document.documentElement).appendChild(script);
      this.script_id_uuid = script.id;
    }
  }

  constructor() {
    
  }
}



// main.js - This is your content script
function codeToInject() {
    // ALL YOUR CODE GOES HERE




    console.log("Extension loaded"); 
    const texteventiframe = document.querySelector('.docs-texteventtarget-iframe');
    const texteventiframe_window = texteventiframe.contentWindow;
    const texteventiframe_doc = texteventiframe_window.document;

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function dispatchTypeEvent(contentWindow, doc, eventType, char) {
        const charCode = char.charCodeAt(0);
        const codeString = "Key" + char.toUpperCase();
        
        const eventInit = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: contentWindow,
            key: char,
            code: codeString,
            location: 0,
            repeat: false
        };

        const keebEvent = new contentWindow.KeyboardEvent(eventType, eventInit);
        Object.defineProperties(keebEvent, {
            keyCode: { value: charCode },
            which: { value: charCode },
            charCode: { value: eventType === 'keypress' ? charCode : 0 },
            key: { value: char },
            code: { value: codeString }
        });

        return doc.dispatchEvent(keebEvent);
    }

    async function writeText(text, perKeyDelay) {
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keydown", char);
            await delay(perKeyDelay);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keypress", char);
            await delay(perKeyDelay);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keyup", char);
            await delay(perKeyDelay);
        }
    }

    async function startWriting() {
        const text = prompt("Enter text to type:");
        if (!text) return;
        const delayStr = prompt("Delay per key (ms):", "100");
        const delay = parseInt(delayStr)|| 100;
        await writeText(text, delay);
    }

    // Inside codeToInject()
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'eztyprWrite') {
        const { text, delay } = event.data;
        await writeText(text, parseInt(delay));
      }
    });




    document.addEventListener('keydown', async (e) => {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyY') {
            e.preventDefault();
            await startWriting();
        }
    });
}

// main.js - This is your content script
function codeToInject() {
    // ALL YOUR CODE GOES HERE




    console.log("Extension loaded"); 
    const texteventiframe = document.querySelector('.docs-texteventtarget-iframe');
    const texteventiframe_window = texteventiframe.contentWindow;
    const texteventiframe_doc = texteventiframe_window.document;

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function dispatchTypeEvent(contentWindow, doc, eventType, char) {
        const charCode = char.charCodeAt(0);
        const codeString = "Key" + char.toUpperCase();
        
        const eventInit = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: contentWindow,
            key: char,
            code: codeString,
            location: 0,
            repeat: false
        };

        const keebEvent = new contentWindow.KeyboardEvent(eventType, eventInit);
        Object.defineProperties(keebEvent, {
            keyCode: { value: charCode },
            which: { value: charCode },
            charCode: { value: eventType === 'keypress' ? charCode : 0 },
            key: { value: char },
            code: { value: codeString }
        });

        return doc.dispatchEvent(keebEvent);
    }

    async function writeText(text, perKeyDelay) {
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keydown", char);
            await delay(perKeyDelay);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keypress", char);
            await delay(perKeyDelay);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keyup", char);
            await delay(perKeyDelay);
        }
    }

    async function startWriting() {
        const text = prompt("Enter text to type:");
        if (!text) return;
        const delayStr = prompt("Delay per key (ms):", "100");
        const delay = parseInt(delayStr)|| 100;
        await writeText(text, delay);
    }

    // Inside codeToInject()
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'eztyprWrite') {
        const { text, delay } = event.data;
        await writeText(text, parseInt(delay) || 100);
      }
    });




    document.addEventListener('keydown', async (e) => {
        if (e.ctrlKey && e.shiftKey && e.code === 'KeyY') {
            e.preventDefault();
            await startWriting();
        }
    });
}

if (!document.documentElement.getAttribute('data-eztypr-injected')) {
    const script = document.createElement('script');
    script.textContent = `(${codeToInject.toString()})();`;
    (document.head || document.documentElement).appendChild(script);
    script.remove();
    document.documentElement.setAttribute('data-eztypr-injected', 'true');
}

// 2. Setup Listener (Only once)
// Use 'browser' for Firefox, fallback to 'chrome' if needed
const runtime = (typeof browser !== 'undefined') ? browser : chrome;

if (!window.eztyprListenerRegistered) {
    runtime.runtime.onMessage.addListener((message) => {
        if (message.command === "write") {
            // Relay message to the injected script
            window.postMessage({
                type: 'eztyprWrite',
                text: message.textToWrite,
                delay: message.delay,
                mistake: message.mistake,
                misspell: message.misspell,
                random: message.random
            }, '*');
        }
    });
    window.eztyprListenerRegistered = true;
}


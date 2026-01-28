// Goes inside content script
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
    //listen to wriitng state messages
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'eztyprState') {
        const data = event.data;
        await writeText(text, parseInt(delay) || 100);
      }
    });
    
  }
}
// Goes inside page Script
class PageScript {
  currentlyWriting = false;
  percentageDone = 0;

  async sendState() {
    window.postMessage({
      type: 'eztyprState',
      state: this.writingState
    }, '*');
  }
  
  async wordListProcessor(wordList) {
    this.currentlyWriting = true;

    for (word in wordList) {
      //itentify which parts of the word isnt in filtered word
      // need mistake and misspell logic
      


      const total_delay = word.delay + word.random; 
      if (!word.mistake || !word.misspell) {
        // basic typing with no modifiers
        const [left_content, right_content] = word.original.split(word.filteredWord)
        // the non word left and right contents are going to have a hardcoded delay
        left_content != "" ? await this.typeString(left_content, left_content.length * 20) : {} // 20 ms per key
        await this.typeString(word.filteredWord, word.total_delay)
        right_content != "" ? await this.typeString(right_content, right_content.length * 20) : {} // 20 ms per key

      }




    }
  }

  async typeMistakeString(string, total_delay) {
    const qwerty = "qwertyuiopasdfghjklzxcvbnm"
    // sends the clossest 2 letters to the current one at offsets of 1 chars then deletes both of them and tries again, delay with mistake
    const delay_per_char = total_delay / string.length;
    for (char in string) {
      if (string.indexOf(char) % 2 == 0) {
        const closest_left = string[string.indexOf(char) -1];
        const closest_right = string[string.indexOf(char) +1];
        if (Math.random() > .5) { // 50% chance to either type the left or right char near it
          this.sendEventSequence(closest_left, delay_per_char)
          this.sendEventSequence(char, delay_per_char)
          this.sendEventSequence("Backspace", delay_per_char)
          this.sendEventSequence("Backspace", delay_per_char)
          this.sendEventSequence(char, delay_per_char)
        } else {
          this.sendEventSequence(char, delay_per_char)
          this.sendEventSequence(closest_right, delay_per_char)
          this.sendEventSequence("Backspace", delay_per_char)
          this.sendEventSequence("Backspace", delay_per_char)
          this.sendEventSequence(char, delay_per_char)
        }
      } else {
        this.sendEventSequence(char, delay_per_char)
      }
      
    }
    
  }

  async typeMisspellString(string, total_delay) {
   const qwerty = "qwertyuiopasdfghjklzxcvbnm"
   // typos a clossest letter to the current one at offsets of 2 chars then deletes the whole word and tries again, double the amount of delay
    
  }

  async typeString(string, total_delay) {
    // simple function that types a string with no modifiers on it 
    const delay_per_char = total_delay / string.length;
    for (const char in string) {
      this.sendEventSequence(char, delay_per_char)
    } 
  }

  async sendEventSequence(key, key_delay) {
    const keyevent = this.createKeyEvent(key);
    if (keyevent.key == 'Backspace') {
      const split_delay = key_delay / 2;
      await sendKeyEvent(texteventiframe_window, texteventiframe_doc, "keydown", keyevent);
      await delay(split_delay);
      await sendKeyEvent(texteventiframe_window, texteventiframe_doc, "keyup", keyevent);
      await delay(split_delay);
    } 
      // prepare the sequence of events for one word
    const split_delay = key_delay / 3;
    await sendKeyEvent(texteventiframe_window, texteventiframe_doc, "keydown", keyevent);
    await delay(split_delay);
    await sendKeyEvent(texteventiframe_window, texteventiframe_doc, "keypress", keyevent);
    await delay(split_delay);
    await sendKeyEvent(texteventiframe_window, texteventiframe_doc, "keyup", keyevent);
    await delay(split_delay);
  }
  createKeyEvent(char) {
    if (char == "Backspace") {
      const backspaceEvent = {
        key: 'Backspace',
        code: 'Backspace',
        keyCode: 8,
        which: 8,
        location: 0,
        timeStamp: Date.now(),
      }; // backspace desnt have charcode because we only need to send keydown and keyup, no keypress
      return backspaceEvent
    } else if (char == "\n") {
      const enterEvent = {
        bubbles: true,
        cancelable: true,
        view: contentWindow,
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        location: 0,
        timeStamp: Date.now(),
      };
      return enterEvent
    } else {
      const charCode = char.charCodeAt(0);
      const codeString = "Key" + char.toUpperCase();
      
      const keyevent = {
          bubbles: true,
          cancelable: true,
          composed: true,
          view: contentWindow,
          key: char,
          code: codeString,
          location: 0,
          repeat: false,
          //charCode: charCode
      };
      return keyevent
    }
  }

  async sendKeyEvent(contentWindow, doc, eventType, keyevent) {
    const keebEvent = new contentWindow.KeyboardEvent(eventType, keyevent);
    Object.defineProperties(keebEvent, {
        keyCode: { value: keyevent.keyCode },
        which: { value: keyevent.which },
        //charCode: { value: eventType == 'keypress' ? keyevent.charCode : 0  },
        // charCode may be optional in relation to backspace and enter
        key: { value: keyevent.key },
        code: { value: keyevent.code }
    });
    // !TODO: need to debug later because some parts are missing that might be needed that i think arent requered
  
    return doc.dispatchEvent(keebEvent);
  }

  async writeChar(char) {

  }

  async writeText(text, total_delay) {
    //unpack the text object

    for (let i = 0; i < text.length; i++) {
        const char = text.charAt(i);
        await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keydown", char);
        await delay(total_delay);
        await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keypress", char);
        await delay(total_delay);
        await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keyup", char);
        await delay(total_delay);
    }
  }

  constructor() {
    //Start the event listener
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'eztyprWrite') {
        const data = event.data;
        await writeText(text, parseInt(delay) || 100);
      }
      //need to listen to state requests too 
      if (event.data.type === 'eztyprStateRequest') {
        await this.sendState()
      }
    });
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

    async function writeText(text, total_delay) {
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keydown", char);
            await delay(total_delay);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keypress", char);
            await delay(total_delay);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keyup", char);
            await delay(total_delay);
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

    async function writeText(text, total_delay) {
        for (let i = 0; i < text.length; i++) {
            const char = text.charAt(i);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keydown", char);
            await delay(total_delay);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keypress", char);
            await delay(total_delay);
            await dispatchTypeEvent(texteventiframe_window, texteventiframe_doc, "keyup", char);
            await delay(total_delay);
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
    runtime.runtime.onMessage.addListener((message) => {
        if (message.command === "write") {
            // Relay message to the injected script
            window.postMessage({
                type: 'eztyprWrite',
                textList: message.textToWrite
            }, '*');
        }
        if (message.command === "stateRequest") {
            // Relay message to the injected script
            window.postMessage({
                type: 'eztyprStateRequest',
            }, '*');
        }
    });


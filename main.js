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
  doneWriting = false; // will always be true after first run but not during any runs

  async sendState() {
    window.postMessage({
      type: 'eztyprState',
      state: this.writingState
    }, '*');
  }
  
  async wordListProcessor(wordList) {
    this.doneWriting = false;
    this.currentlyWriting = true;

    for (word in wordList) {
      this.percentageDone = Math.floor(wordList.length / wordList.indexOf(word)) * 100 
      const total_delay = word.delay + word.random; 
      const [left_content, right_content] = word.original.split(word.filteredWord)
      left_content != "" ? await this.typeString(left_content, left_content.length * 20) : {} // 20 ms per key
      if (!word.mistake || !word.misspell) {
        await this.typeString(word.filteredWord, total_delay)
      } else if (word.mistake) {
        await this.typeMistakeString(word.filteredWord, total_delay)
      } else if (word.misspell) {
        await this.typeMisspellString(word.filteredWord, total_delay)
      }
      right_content != "" ? await this.typeString(right_content, right_content.length * 20) : {} // 20 ms per key

    }
    this.currentlyWriting = false; //done from here on out 
    this.doneWriting = true;
  }

  async typeMistakeString(string, total_delay) {
    const qwerty = "qwertyuiopasdfghjklzxcvbnm"
    // sends the clossest 2 letters to the current one at offsets of 1 chars then deletes both of them and tries again
    const delay_per_char = total_delay / string.length;
    for (char in string) {
      if (Math.random() > .75) { // misspells 75% of the time
        const closest_left = qwerty[qwerty.indexOf(char) -1];
        const closest_right = qwerty[qwerty.indexOf(char) +1];
        if (Math.random() > .5) { // on a coin toss either type the left or right char near it
          // !TODO: figure out if the extra delay is necessary or not 
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
   // typos a clossest letter to the current one at offsets of 2 chars then deletes the whole word and tries again
    
    const delay_per_char = total_delay / string.length;
    
    for (const char in string) {
      if (string.indexOf(char) % 2 ==0) {
        const closest_left = qwerty[qwerty.indexOf(char) -1];
        const closest_right = qwerty[qwerty.indexOf(char) +1]; 
        // On a coin toss it either send the left or right closes char 
        Math.random() > .5 ? await this.sendEventSequence(closest_left, delay_per_char) : await this.sendEventSequence(closest_right, delay_per_char)

      } else {
        this.sendEventSequence(char, delay_per_char)
      }
    }
    // !TODO: word delay is doubled here, this may or may not be wanted
    // delete the entire word
    for (const i = 0; i < string.length; i++ ) {
      this.sendEventSequence("Backspace", 20)
    }
    // rewrite it all over again
    string.forEach(char => { this.sendEventSequence(char, delay_per_char)});
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


// Goes inside content script
class KeySim {
  script_id_uuid = ""

  script_to_inject() {
    return function() {
      const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
      
      class PageScript {
        currentlyWriting = false;
        percentageDone = 0;
        doneWriting = false;
      
        async sendState() {
          window.postMessage({
            type: 'eztyprState',
            state: {
              currentlyWriting: this.currentlyWriting,
              percentageDone: this.percentageDone,
              doneWriting: this.doneWriting
            }
          }, '*');
        }
        
        async wordListProcessor(wordList) {
          this.doneWriting = false;
          this.currentlyWriting = true;
           
          for (let wordIndex = 0; wordIndex < wordList.length; wordIndex++) {
            const word = wordList[wordIndex];
            console.log(JSON.stringify(word));
            this.percentageDone = Math.floor((wordIndex / wordList.length) * 100);
            const total_delay = word.delay + word.random;
            const [left_content, right_content] = word.original.split(word.filteredWord);
            
            if (left_content) await this.typeString(left_content, left_content.length * 20);
            
            if (!word.mistake && !word.misspell) {
              await this.typeString(word.filteredWord, total_delay);
            } else if (word.mistake) {
              await this.typeMistakeString(word.filteredWord, total_delay);
            } else if (word.misspell) {
              await this.typeMisspellString(word.filteredWord, total_delay);
            }
            
            if (right_content) await this.typeString(right_content, right_content.length * 20);
          }
          
          this.currentlyWriting = false;
          this.doneWriting = true;
        }
      
        async typeMistakeString(string, total_delay) {
          const qwerty = "qwertyuiopasdfghjklzxcvbnm";
          const delay_per_char = total_delay / string.length;
          
          for (const char of string) {
            if (Math.random() > 0.75) {
              const charIndex = qwerty.indexOf(char.toLowerCase());
              const closest_left = charIndex > 0 ? qwerty[charIndex - 1] : char;
              const closest_right = charIndex < qwerty.length - 1 ? qwerty[charIndex + 1] : char;
              
              if (Math.random() > 0.5) {
                await this.sendEventSequence(closest_left, delay_per_char);
                await this.sendEventSequence(char, delay_per_char);
                await this.sendEventSequence("Backspace", delay_per_char);
                await this.sendEventSequence("Backspace", delay_per_char);
                await this.sendEventSequence(char, delay_per_char);
              } else {
                await this.sendEventSequence(char, delay_per_char);
                await this.sendEventSequence(closest_right, delay_per_char);
                await this.sendEventSequence("Backspace", delay_per_char);
                await this.sendEventSequence("Backspace", delay_per_char);
                await this.sendEventSequence(char, delay_per_char);
              }
            } else {
              await this.sendEventSequence(char, delay_per_char);
            }
          }
        }
      
        async typeMisspellString(string, total_delay) {
          const qwerty = "qwertyuiopasdfghjklzxcvbnm";
          const delay_per_char = total_delay / string.length;
          
          for (let i = 0; i < string.length; i++) {
            const char = string[i];
            if (i % 2 === 0) {
              const charIndex = qwerty.indexOf(char.toLowerCase());
              const closest_left = charIndex > 0 ? qwerty[charIndex - 1] : char;
              const closest_right = charIndex < qwerty.length - 1 ? qwerty[charIndex + 1] : char;
              
              Math.random() > 0.5 
                ? await this.sendEventSequence(closest_left, delay_per_char)
                : await this.sendEventSequence(closest_right, delay_per_char);
            } else {
              await this.sendEventSequence(char, delay_per_char);
            }
          }
          
          for (let i = 0; i < string.length; i++) {
            await this.sendEventSequence("Backspace", 20);
          }
          
          for (const char of string) {
            await this.sendEventSequence(char, delay_per_char);
          }
        }
      
        async typeString(string, total_delay) {
          const delay_per_char = total_delay / string.length;
          for (const char of string) {
            await this.sendEventSequence(char, delay_per_char);
          }
        }
      
        async sendEventSequence(key, key_delay) {
          const keyevent = this.createKeyEvent(key);
          const split_delay = key_delay / 3;
          
          if (keyevent.key === 'Backspace') {
            await sendKeyEvent("keydown", keyevent);
          } else {
            await sendKeyEvent("keydown", keyevent);
            await delay(split_delay);
            await sendKeyEvent("keypress", keyevent);
            await delay(split_delay);
            await sendKeyEvent("keyup", keyevent);
          }
          await delay(split_delay);
        }
        
        createKeyEvent(char) {
          if (char === "Backspace") {
            return {
              key: 'Backspace',
              code: 'Backspace',
              keyCode: 8,
              which: 8,
              location: 0,
              timeStamp: Date.now(),
            };
          } else if (char === "\\n") {
            return {
              bubbles: true,
              cancelable: true,
              view: texteventiframe_window,
              key: 'Enter',
              code: 'Enter',
              keyCode: 13,
              which: 13,
              location: 0,
              timeStamp: Date.now(),
            };
          } else {
            const codeString = "Key" + char.toUpperCase();
            return {
              bubbles: true,
              cancelable: true,
              composed: true,
              view: texteventiframe_window,
              key: char,
              code: codeString,
              location: 0,
              repeat: false,
            };
          }
        }
      
        async sendKeyEvent(eventType, keyevent) {
          const keebEvent = new this.texteventiframe_window.KeyboardEvent(eventType, keyevent);
          Object.defineProperties(keebEvent, {
            keyCode: { value: keyevent.keyCode },
            which: { value: keyevent.which },
            key: { value: keyevent.key },
            code: { value: keyevent.code }
          });
          return this.texteventiframe_doc.dispatchEvent(keebEvent);
        }
      
        constructor() {
          this.texteventiframe = document.querySelector('.docs-texteventtarget-iframe');
          this.texteventiframe_window = texteventiframe.contentWindow;   
          this.texteventiframe_doc = texteventiframe_window.document;   
          window.addEventListener('message', async (event) => {
            if (event.data.type === 'eztyprWrite') {
              console.log(`Got message, ${event.data.textList}`)
              await this.wordListProcessor(event.data.textList);
            }
            if (event.data.type === 'eztyprStateRequest') {
              await this.sendState();
            }
          });
        }
      }
      
      new PageScript();
    };
  }

  injectScript() {
    if (!this.script_id_uuid) {
      const script = document.createElement('script');
      script.id = crypto.randomUUID();
      script.textContent = `(${this.script_to_inject().toString()})();`;
      (document.head || document.documentElement).appendChild(script);
      this.script_id_uuid = script.id;
    }
  }

  constructor() {
    this.injectScript();
    console.log(`Script has been injected, ${this.script_id_uuid}`);

    const runtime = (typeof browser !== 'undefined') ? browser : chrome;
    runtime.runtime.onMessage.addListener((message) => {
        if (message.command === "write") {
            // Relay message to the injected script
            console.log(`Got text list: ${JSON.stringify(message.textToWrite)}`)
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

    window.addEventListener('message', async (event) => {
      if (event.data.type === 'eztyprState') {
        console.log('State:', event.data.state);
      }
    });
  }
}



const keysim = new KeySim();


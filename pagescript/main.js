// Goes inside content script
class KeySim {
  script_id_uuid = ""
  pagescriptcode = function() {

    class PageScript {
      currentlyWriting = false;
      percentageDone = 0;
      stopReq = false;
      doneWriting = false; // will always be true after first run but not during any runs
      async sendState() {
        window.postMessage({
          type: 'eztyprState',
          state: {
            currentlyWriting: this.currentlyWriting,
            percentageDone: this.percentageDone,
            uuid: crypto.randomUUID()
          }
        }, '*');
      }

      blockKeeb() {
        this.block = document.createElement("div");
        this.block.id = "keebBlocker";
        this.block.style.position = "fixed";
        this.block.style.width = "100%";
        this.block.style.height = "100%";
        this.block.style.top = 0
        this.block.style.left = 0
        this.block.style.right = 0
        this.block.style.bottom = 0
        this.block.style.zIndex = 1000;
        this.block.style.justifyContent = "center";
        this.block.style.alignItems = "center;";
        this.block.style.display = "grid";
        this.block.style.placeItems = "center";
        this.block.style.background = "rgba(0, 0, 0, 0.5)";
        this.block.addEventListener('mousedown', e => e.preventDefault(), true);
        this.block.addEventListener('keydown', e => e.preventDefault(), true);
        this.block.addEventListener('click', e => e.preventDefault(), true);
        document.body.appendChild(this.block);
        this.prog = document.createElement("p");
        this.prog.id = "typingProgress";
        this.prog.innerHTML = "Currently Typing: ";
        this.prog.style.color = "white";
        this.prog.style.fontSize = "34px";
        this.prog.style.textAlign = "center";
        this.block.appendChild(this.prog);
      }

      clearBlock() {
        this.block.remove() // The paragraph should be gone with it too since its  a child of it
      }

      start() {
        this.doneWriting = false;
        this.currentlyWriting = true;
        this.blockKeeb()
      }

      async end() {
        this.percentageDone = 0;
        this.currentlyWriting = false;
        this.doneWriting = true;
        this.clearBlock();
        await this.sendState()
      }
      async wordListProcessor(wordList) {
        this.start();
        for (let i = 0; i < wordList.length; i++) {
          if (this.stopReq) { this.stopReq = false; return await this.end() } // stop request handling logic
          const word = wordList[i];
          this.percentageDone = wordList.indexOf(word) / wordList.length; // update percenage
          this.prog.innerHTML = `Currently Typing: ${(Math.round(this.percentageDone * 100))}% done.` // update the blocker's percentage shown
          if (word.pause) { // pause logic
            console.log("pausing")
            this.prog.innerHTML = `Currently Typing: ${(Math.round(this.percentageDone * 100))}% done.\nPausing for ${word.dur / 1000 / 60} minutes.`
            await this.delay(word.dur);
          }

          try {
            const total_delay = (word.delay + word.random); // add up total delay for word
            const [left_content, right_content] = word.original.split(word.filteredWord) // Due to the way we highlighted, we dont want to include the extra stuff from the left or right side of the actuall "word", like quotes or commas or periods, inside the same delay block as the "word", as this deviates from what is highlighted, so we split the original word by the filtered word and get out a tuple, which we then set to a hardcoded delay
            left_content && left_content != "" ? await this.typeString(left_content, left_content.length * 20) : {} // 20 ms per key
            if (!word.mistake && !word.misspell) {
              await this.typeString(word.filteredWord, total_delay)
            } else if (word.mistake) {
              await this.typeMistakeString(word.filteredWord, total_delay)
            } else if (word.misspell) {
              await this.typeMisspellString(word.filteredWord, total_delay)
            }
            right_content && right_content != "" ? await this.typeString(right_content, right_content.length * 20) : {} // 20 ms per key
            await this.sendEventSequence("Space", 20);

          } catch {
            // just skip the word
            continue
          }
        }
        this.end();
      }

      async typeMistakeString(string, total_delay) {
        const qwerty = "qwertyuiopasdfghjklzxcvbnm"
        // sends the clossest 2 letters to the current one at offsets of 1 chars then deletes both of them and tries again
        const delay_per_char = total_delay / string.length;
        for (let i = 0; i < string.length; i++) {
          const char = string[i];
          if (char && qwerty.includes(char)) {
            if (Math.random() > .75) { // misspells 75% of the time
              // !TODO: figure out if the extra delay is necessary or not 
              const charToMistake = (qwerty[qwerty.indexOf(char) + (Math.random() > .5 ? -1 : +1)]);
              console.log(charToMistake)
              await this.sendEventSequence(charToMistake, delay_per_char)
              await this.sendEventSequence(char, delay_per_char)
              // for some reason, sending one backspace makes it click twice 
              await this.sendEventSequence("Backspace", delay_per_char)
              await this.sendEventSequence("Backspace", delay_per_char)
              await this.sendEventSequence(char, delay_per_char)

            } else {
              await this.sendEventSequence(char, delay_per_char)
            }
          } else {
            await this.sendEventSequence(char, delay_per_char)
          }
        }
      }

      async typeMisspellString(string, total_delay) {
        const qwerty = "qwertyuiopasdfghjklzxcvbnm"
        // typos a clossest letter to the current one at offsets of 2 chars then deletes the whole word and tries again

        const delay_per_char = total_delay / string.length;

        for (let i = 0; i < string.length; i++) {
          const char = string[i];
          if (string.indexOf(char) % 2 == 0 && qwerty.includes(char)) {
            const closest_left = qwerty[qwerty.indexOf(char) - 1];
            const closest_right = qwerty[qwerty.indexOf(char) + 1];
            // On a coin toss it either send the left or right closes char 
            Math.random() > .5 ? await this.sendEventSequence(closest_left, delay_per_char) : await this.sendEventSequence(closest_right, delay_per_char)

          } else {
            await this.sendEventSequence(char, delay_per_char)
          }
        }
        // !TODO: word delay is doubled here, this may or may not be wanted
        // delete the entire word
        for (const i = 0; i < string.length; i++) {
          await this.sendEventSequence("Backspace", 20)
        }
        // rewrite it all over again
        for (let i = 0; i < string.length; i++) {
          await this.sendEventSequence(string[i], delay_per_char)
        }
      }


      async typeString(string, total_delay) {
        // simple function that types a string with no modifiers on it 
        const delay_per_char = total_delay / string.length;
        for (let i = 0; i < string.length; i++) {
          await this.sendEventSequence(string[i], delay_per_char)
        }
      }

      async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      async sendEventSequence(key, key_delay) {
        if (key == undefined) return;
        const keyevent = this.createKeyEvent(key);
        if (keyevent.key == 'Backspace') {
          // non printable keys appear on one key event so putting more then leads to repetiton 
          await this.sendKeyEvent("keyup", keyevent);
          await this.delay(key_delay);
        } else if (keyevent.key == 'Space') {
          // non printable keys appear on one key event so putting more then leads to repetiton 
          await this.sendKeyEvent("keyup", keyevent);
          await this.delay(key_delay);
        }
        // prepare the sequence of events for one word
        const split_delay = key_delay / 3;
        await this.sendKeyEvent("keydown", keyevent);
        await this.delay(split_delay);
        await this.sendKeyEvent("keypress", keyevent);
        await this.delay(split_delay);
        await this.sendKeyEvent("keyup", keyevent);
        await this.delay(split_delay);
      }
      createKeyEvent(char) {
        if (char == "Backspace") {
          const backspaceEvent = {
            bubbles: true,
            cancelable: true,
            key: 'Backspace',
            code: 'Backspace',
            keyCode: 8,
            which: 8,
            location: 0,
            repeat: false,
            timeStamp: Date.now(),
          }; // backspace desnt have charcode because we only need to send keydown and keyup, no keypress
          return backspaceEvent
        } else if (char == "\n") {
          const enterEvent = {
            bubbles: true,
            cancelable: true,
            view: this.texteventiframe_window,
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            location: 0,
            repeat: false,
            timeStamp: Date.now(),
          };
          return enterEvent
        } else if (char == "Space") {
          const spaceEvent = {
            bubbles: true,
            cancelable: true,
            key: " ",
            code: "Space",
            location: 0,
            repeat: false,
            charCode: 0,
            keyCode: 32,
            which: 32,
            timeStamp: Date.now(),
          }
          return spaceEvent;
        } else {
          const charCode = char.charCodeAt(0);
          const codeString = "Key" + char.toUpperCase();

          const keyevent = {
            bubbles: true,
            cancelable: true,
            composed: true,
            view: this.texteventiframe_window,
            key: char,
            code: codeString,
            location: 0,
            repeat: false,
            charCode: charCode
          };
          return keyevent
        }
      }

      async sendKeyEvent(eventType, keyevent) {
        const keebEvent = new this.texteventiframe_window.KeyboardEvent(eventType, keyevent);
        Object.defineProperties(keebEvent, {
          keyCode: { value: keyevent.keyCode },
          which: { value: keyevent.which },
          //charCode: { value: eventType == 'keypress' ? keyevent.charCode : 0  },
          // charCode may be optional in relation to backspace and enter
          key: { value: keyevent.key },
          code: { value: keyevent.code }
        });
        // !TODO: need to debug later because some parts are missing that might be needed that i think arent requered

        return this.texteventiframe_doc.dispatchEvent(keebEvent);
      }



      constructor() {
        // create the iframe field here because class field definetions cannot run logic
        this.texteventiframe = document.querySelector('.docs-texteventtarget-iframe');
        this.texteventiframe_window = this.texteventiframe.contentWindow;
        this.texteventiframe_doc = this.texteventiframe_window.document;
        //Start the event listener
        window.addEventListener('message', async (event) => {
          if (event.data.type === 'eztyprWrite') {
            const data = event.data;
            await this.wordListProcessor(event.data.textList)
          }
          //need to listen to state requests too 
          if (event.data.type === 'eztyprStateRequest') {
            console.log("Got state request")
            await this.sendState()
          }

          if (event.data.type === 'eztyprStopRequest') {
            console.log("Got stop request")
            this.stopReq = true;
          }
        });

        document.addEventListener('keydown', async (e) => {
          if (e.ctrlKey && e.shiftKey && e.code === 'KeyY') {
            alert("Sending Backspace event")
            this.sendEventSequence("Backspace", 20)
          }
        });

      }
    }
    const pagescript = new PageScript();
    //page script is started up to  this point
  }
  injectPageScript() {
    if (!this.script_id_uuid) {
      const script = document.createElement('script');
      console.log("Script injected")
      script.id = crypto.randomUUID();
      script.textContent = `(${this.pagescriptcode.toString()})();`;
      (document.head || document.documentElement).appendChild(script);
      console.log(`script id is ${script.id}`)
      this.script_id_uuid = script.id;
    }
  }

  constructor() {

    //listen to wriitng state messages
    window.addEventListener('message', async (event) => {
      if (event.data.type === 'eztyprState') {
        if (event.source !== window) return;
        try {
          const runtime = (typeof browser !== 'undefined') ? browser : chrome;

          runtime.runtime.sendMessage({
            command: "state",
            state: event.data.state,
          });
        } catch (error) {
          console.error("Error:", error);
        }
      }
    }
    );

    const runtime = (typeof browser !== 'undefined') ? browser : chrome;
    runtime.runtime.onMessage.addListener((message) => {
      if (message.command === "write") {
        console.log("Got write command from background script")
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
      if (message.command === "stopRequest") {
        // Relay message to the injected script
        window.postMessage({
          type: 'eztyprStopRequest',
        }, '*');
      }
    });

  }



}

const keysim = new KeySim()
keysim.injectPageScript()

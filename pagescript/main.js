// Goes inside content script
class KeySim {
  script_id_uuid = ""
  pagescriptcode = function() {

    class PageScript {
      currentlyWriting = false;
      percentageDone = 0;
      doneWriting = false; // will always be true after first run but not during any runs
      async sendState() {
        window.postMessage({
          type: 'eztyprState',
          state: {
            currentlyWriting : this.currentlyWriting,
            percentageDone : this.percentageDone
          }
        }, '*');
      }
      
      async wordListProcessor(wordList) {
        this.doneWriting = false;
        this.currentlyWriting = true;
        for (let i = 0; i < wordList.length; i++) {
          const word = wordList[i];
          console.log(`${word.filteredWord} and ${word.originalword}`)
          this.percentageDone = Math.floor(wordList.length / wordList.indexOf(word)) * 100 
          const total_delay = (word.delay + word.random); 
          const [left_content, right_content] = word.originalword.split(word.filteredWord)
          left_content != "" ? await this.typeString(left_content, left_content.length * 20) : {} // 20 ms per key
          if (!word.mistake && !word.misspell) {
            await this.typeString(word.filteredWord, total_delay)
          } else if (word.mistake) {
            await this.typeMistakeString(word.filteredWord, total_delay)
          } else if (word.misspell) {
            await this.typeMisspellString(word.filteredWord, total_delay)
          }
          right_content != "" ? await this.typeString(right_content, right_content.length * 20) : {} // 20 ms per key
          await this.sendEventSequence("Space", 20);
        }
        this.currentlyWriting = false; //done from here on out 
        this.doneWriting = true;
      }
    
      async typeMistakeString(string, total_delay) {
        const qwerty = "qwertyuiopasdfghjklzxcvbnm"
        // sends the clossest 2 letters to the current one at offsets of 1 chars then deletes both of them and tries again
          const delay_per_char = total_delay / string.length;
          console.log(`mistaking word: ${string}`)
          for (let i = 0; i < string.length; i++) {
            const char = string[i];
            if (char && qwerty.includes(char)) {
              if (Math.random() > .75) { // misspells 75% of the time
                  // !TODO: figure out if the extra delay is necessary or not 
                const charToMistake = (qwerty[qwerty.indexOf(char)  + (Math.random() > .5 ? -1 : +1)]);
                console.log(charToMistake)
                await this.sendEventSequence(charToMistake, delay_per_char)
                console.log(char)
                await this.sendEventSequence(char, delay_per_char)
                // for some reason, sending one backspace makes it click twice 
                await this.sendEventSequence("Backspace", delay_per_char)
                await this.sendEventSequence("Backspace", delay_per_char)
                console.log(char)
                await this.sendEventSequence(char, delay_per_char)
                
              } else {
                console.log(char)
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
          if (string.indexOf(char) % 2 ==0 && qwerty.includes(char)) {
            const closest_left = qwerty[qwerty.indexOf(char) -1];
            const closest_right = qwerty[qwerty.indexOf(char) +1]; 
            // On a coin toss it either send the left or right closes char 
            Math.random() > .5 ? await this.sendEventSequence(closest_left, delay_per_char) : await this.sendEventSequence(closest_right, delay_per_char)
    
          } else {
            await this.sendEventSequence(char, delay_per_char)
          }
        }
        // !TODO: word delay is doubled here, this may or may not be wanted
        // delete the entire word
        for (const i = 0; i < string.length; i++ ) {
          await this.sendEventSequence("Backspace", 20)
        }
        // rewrite it all over again
        for (let i = 0; i < string.length; i++) {
          await this.sendEventSequence(string[i], delay_per_char)
        }
      }
    
    
      async typeString(string, total_delay) {
        console.log(`typing string: ${string}`)
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
          await this.sendKeyEvent( "keyup", keyevent);
          await this.delay(key_delay);
        } else if (keyevent.key == 'Space') {
          // non printable keys appear on one key event so putting more then leads to repetiton 
          await this.sendKeyEvent( "keyup", keyevent);
          await this.delay(key_delay);
        }
          // prepare the sequence of events for one word
        const split_delay = key_delay / 3;
        await this.sendKeyEvent( "keydown", keyevent);
        await this.delay(split_delay);
        await this.sendKeyEvent( "keypress", keyevent);
        await this.delay(split_delay);
        await this.sendKeyEvent( "keyup", keyevent);
        await this.delay(split_delay);
      }
      createKeyEvent(char) {
        console.log(`Sending event ${char}`)
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
            await this.sendState()
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
        } catch(error) {
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
    });
    
  }
  
  

}

const keysim = new KeySim()
keysim.injectPageScript()
// Goes inside page Script
//class PageScript {
//  currentlyWriting = false;
//  percentageDone = 0;
//  doneWriting = false; // will always be true after first run but not during any runs
//
//  async sendState() {
//    window.postMessage({
//      type: 'eztyprState',
//      state: this.writingState
//    }, '*');
//  }
//  
//  async wordListProcessor(wordList) {
//    this.doneWriting = false;
//    this.currentlyWriting = true;
//
//    for (word in wordList) {
//      this.percentageDone = Math.floor(wordList.length / wordList.indexOf(word)) * 100 
//      const total_delay = word.delay + word.random; 
//      const [left_content, right_content] = word.original.split(word.filteredWord)
//      left_content != "" ? await this.typeString(left_content, left_content.length * 20) : {} // 20 ms per key
//      if (!word.mistake || !word.misspell) {
//        await this.typeString(word.filteredWord, total_delay)
//      } else if (word.mistake) {
//        await this.typeMistakeString(word.filteredWord, total_delay)
//      } else if (word.misspell) {
//        await this.typeMisspellString(word.filteredWord, total_delay)
//      }
//      right_content != "" ? await this.typeString(right_content, right_content.length * 20) : {} // 20 ms per key
//
//    }
//    this.currentlyWriting = false; //done from here on out 
//    this.doneWriting = true;
//  }
//
//  async typeMistakeString(string, total_delay) {
//    const qwerty = "qwertyuiopasdfghjklzxcvbnm"
//    // sends the clossest 2 letters to the current one at offsets of 1 chars then deletes both of them and tries again
//    const delay_per_char = total_delay / string.length;
//    for (char in string) {
//      if (Math.random() > .75) { // misspells 75% of the time
//        const closest_left = qwerty[qwerty.indexOf(char) -1];
//        const closest_right = qwerty[qwerty.indexOf(char) +1];
//        if (Math.random() > .5) { // on a coin toss either type the left or right char near it
//          // !TODO: figure out if the extra delay is necessary or not 
//          this.sendEventSequence(closest_left, delay_per_char)
//          this.sendEventSequence(char, delay_per_char)
//          this.sendEventSequence("Backspace", delay_per_char)
//          this.sendEventSequence("Backspace", delay_per_char)
//          this.sendEventSequence(char, delay_per_char)
//        } else {
//          this.sendEventSequence(char, delay_per_char)
//          this.sendEventSequence(closest_right, delay_per_char)
//          this.sendEventSequence("Backspace", delay_per_char)
//          this.sendEventSequence("Backspace", delay_per_char)
//          this.sendEventSequence(char, delay_per_char)
//        }
//      } else {
//        this.sendEventSequence(char, delay_per_char)
//      }
//      
//    }
//    
//  }
//
//  async typeMisspellString(string, total_delay) {
//   const qwerty = "qwertyuiopasdfghjklzxcvbnm"
//   // typos a clossest letter to the current one at offsets of 2 chars then deletes the whole word and tries again
//    
//    const delay_per_char = total_delay / string.length;
//    
//    for (const char in string) {
//      if (string.indexOf(char) % 2 ==0) {
//        const closest_left = qwerty[qwerty.indexOf(char) -1];
//        const closest_right = qwerty[qwerty.indexOf(char) +1]; 
//        // On a coin toss it either send the left or right closes char 
//        Math.random() > .5 ? await this.sendEventSequence(closest_left, delay_per_char) : await this.sendEventSequence(closest_right, delay_per_char)
//
//      } else {
//        this.sendEventSequence(char, delay_per_char)
//      }
//    }
//    // !TODO: word delay is doubled here, this may or may not be wanted
//    // delete the entire word
//    for (const i = 0; i < string.length; i++ ) {
//      this.sendEventSequence("Backspace", 20)
//    }
//    // rewrite it all over again
//    string.forEach(char => { this.sendEventSequence(char, delay_per_char)});
//  }
//
//
//  async typeString(string, total_delay) {
//    // simple function that types a string with no modifiers on it 
//    const delay_per_char = total_delay / string.length;
//    for (const char in string) {
//      this.sendEventSequence(char, delay_per_char)
//    } 
//  }
//
//  async sendEventSequence(key, key_delay) {
//    const keyevent = this.createKeyEvent(key);
//    if (keyevent.key == 'Backspace') {
//      const split_delay = key_delay / 2;
//      await sendKeyEvent(texteventiframe_window, texteventiframe_doc, "keydown", keyevent);
//      await delay(split_delay);
//      await sendKeyEvent(texteventiframe_window, texteventiframe_doc, "keyup", keyevent);
//      await delay(split_delay);
//    } 
//      // prepare the sequence of events for one word
//    const split_delay = key_delay / 3;
//    await sendKeyEvent(texteventiframe_window, texteventiframe_doc, "keydown", keyevent);
//    await delay(split_delay);
//    await sendKeyEvent(texteventiframe_window, texteventiframe_doc, "keypress", keyevent);
//    await delay(split_delay);
//    await sendKeyEvent(texteventiframe_window, texteventiframe_doc, "keyup", keyevent);
//    await delay(split_delay);
//  }
//  createKeyEvent(char) {
//    if (char == "Backspace") {
//      const backspaceEvent = {
//        key: 'Backspace',
//        code: 'Backspace',
//        keyCode: 8,
//        which: 8,
//        location: 0,
//        timeStamp: Date.now(),
//      }; // backspace desnt have charcode because we only need to send keydown and keyup, no keypress
//      return backspaceEvent
//    } else if (char == "\n") {
//      const enterEvent = {
//        bubbles: true,
//        cancelable: true,
//        view: this.texteventiframe_window,
//        key: 'Enter',
//        code: 'Enter',
//        keyCode: 13,
//        which: 13,
//        location: 0,
//        timeStamp: Date.now(),
//      };
//      return enterEvent
//    } else {
//      const charCode = char.charCodeAt(0);
//      const codeString = "Key" + char.toUpperCase();
//      
//      const keyevent = {
//          bubbles: true,
//          cancelable: true,
//          composed: true,
//          view: this.texteventiframe_window,
//          key: char,
//          code: codeString,
//          location: 0,
//          repeat: false,
//          //charCode: charCode
//      };
//      return keyevent
//    }
//  }
//
//  async sendKeyEvent(this.texteventiframe_window, doc, eventType, keyevent) {
//    const keebEvent = new this.texteventiframe_window.KeyboardEvent(eventType, keyevent);
//    Object.defineProperties(keebEvent, {
//        keyCode: { value: keyevent.keyCode },
//        which: { value: keyevent.which },
//        //charCode: { value: eventType == 'keypress' ? keyevent.charCode : 0  },
//        // charCode may be optional in relation to backspace and enter
//        key: { value: keyevent.key },
//        code: { value: keyevent.code }
//    });
//    // !TODO: need to debug later because some parts are missing that might be needed that i think arent requered
//  
//    return doc.dispatchEvent(keebEvent);
//  }
//
//
//
//  constructor() {
//    //Start the event listener
//    window.addEventListener('message', async (event) => {
//      if (event.data.type === 'eztyprWrite') {
//        const data = event.data;
//        await writeText(text, parseInt(delay) || 100);
//      }
//      //need to listen to state requests too 
//      if (event.data.type === 'eztyprStateRequest') {
//        await this.sendState()
//      }
//    });
//  }
//}




// 2. Setup Listener (Only once)
// Use 'browser' for Firefox, fallback to 'chrome' if needed
// !TODO: cleanup later
//const runtime = (typeof browser !== 'undefined') ? browser : chrome;
//    runtime.runtime.onMessage.addListener((message) => {
//        if (message.command === "write") {
//            // Relay message to the injected script
//            window.postMessage({
//                type: 'eztyprWrite',
//                textList: message.textToWrite
//            }, '*');
//        }
//        if (message.command === "stateRequest") {
//            // Relay message to the injected script
//            window.postMessage({
//                type: 'eztyprStateRequest',
//            }, '*');
//        }
//    });
//

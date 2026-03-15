
class Popup {
  textarea = document.getElementById("text-to-write");
  backdrop = document.getElementById('backdrop');

  delay_input = document.getElementById("delay-input");
  delay_print = document.getElementById("delay-print");

  mistake_check = document.getElementById("mistake");
  mistake_input = document.getElementById("mistake-intensity-input");
  mistake_input_print = document.getElementById("mistake-intensity-print");
  mistake_slider = document.getElementById("mistake-intensity-slider");

  misspell_check = document.getElementById("misspell");

  random_delay = document.getElementById("random-delay-input");
  random_delay_print = document.getElementById("random-delay-print");
  random_delay_check = document.getElementById("random_delay");
  random_delay_slider = document.getElementById("random-delay-slider");

  pause_freq = document.getElementById("pause-freq-input");
  pause_freq_print = document.getElementById("pause-freq-print");
  pause_freq_check = document.getElementById("pause-freq");
  pause_freq_slider = document.getElementById("pause-freq-slider");

  pause_dur = document.getElementById("pause-dur-input");
  pause_dur_print = document.getElementById("pause-dur-print");
  pause_dur_check = document.getElementById("pause-dur");
  pause_dur_slider = document.getElementById("pause-dur-slider");

  button = document.getElementById("start-type");

  errorBox = document.getElementById("err-dialog");
  errorBoxContent = document.getElementById("err-dialog-content");

  writingState = {};
  wordList = [];

  showErr(content) {
    this.errorBoxContent.innerHTML = content;
    this.errorBox.show();
  }




  syncScroll() {
    if (!this.textarea || !this.backdrop) return;
    this.backdrop.scrollTop = this.textarea.scrollTop;
    this.backdrop.scrollLeft = this.textarea.scrollLeft;
  }

  applyHighlight(safeText) {
    // this is for the problem of having substrings that appear multiple times be computed the same, even if they are different words, like "school" comes before "school-realted" and since this contains "school", it will be computed when "school" itself is computed
    const sortedList = [...this.wordList].sort((a, b) =>
      b.filteredWord.length - a.filteredWord.length
    );

    sortedList.forEach(word => {
      if (word.misspell || word.mistake) {
        let colorClass = word.misspell ? 'bg-red-300' : 'bg-yellow-300';

        const escapedWord = word.filteredWord.replace(/[.\-_*+?^$`'"{}()|[\]\\]/g, '\\$&');

        const regex = new RegExp(`(?<![\\w\\-])(${escapedWord})(?![\\w\\-])`, 'gi');

        safeText = safeText.replace(regex, (match, p1, offset) => {
          const precedingText = safeText.slice(0, offset);
          if (precedingText.lastIndexOf('<') > precedingText.lastIndexOf('>')) {
            return match; // We are inside a tag, return original
          }
          return `<span class="${colorClass} text-transparent rounded-sm">${p1}</span>`;
        });
      }
    });

    return safeText;
  }



  generateWordlist(withDelay = false) {
    let text = this.textarea.value;
    const tempWordList = [];
    if (text == "") text = ".";
    let escapedText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    escapedText.split(/\s+/).forEach((word, index) => {
      const wordobj = {};
      if (index % this.pause_freq.value === 0 && index != 0) { // every nth word that mod pause freq = 0 is going to have a pause right before it 
        wordobj.pause = true;
        wordobj.dur = this.pause_dur.value * 1000 * 60;
      }
      wordobj.original = word;
      if (!word || word == " ") return; // if word is nothing or space
      const filteredWord = word.length != 1 ? word.replace(/[.,!$%^&*;:{}`()"\[\]]/g, " ").trim() : word;
      if (!filteredWord) return;
      wordobj.filteredWord = filteredWord;

      const random = (Math.floor(Math.random() * 100) + 1);
      const intensity_value = (parseInt(this.mistake_input.value));
      //Misspell and Mistake Logic
      if (random <= intensity_value) {
        wordobj.mistake = true
      }
      if (this.misspell_check.checked) {
        if (filteredWord.length > 6) {
          wordobj.misspell = true;
          wordobj.mistake = false;
        }

      }

      if (withDelay) {
        wordobj.delay = this.delay_input.value;
        wordobj.random = Math.floor(Math.random() * (this.random_delay.value - 0 + 1) + 0)
      }


      tempWordList.push(wordobj);
    })
    this.wordList = [...new Set(tempWordList)]
  }

  updateHighlights2() {
    if (!this.textarea || !this.backdrop) return;
    let text = this.textarea.value;
    // 1. Escape HTML to prevent XSS (Do this once)
    let safeText = text.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    this.generateWordlist()
    safeText = this.applyHighlight(safeText);

    // 4. Handle newline behavior
    if (safeText.endsWith('\n')) {
      safeText += '<br><span class="text-transparent">A</span>';
    }
    //add the lists to the object
    backdrop.innerHTML = safeText + "<br>";
  }

  async sendMsg() {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });

      browser.tabs.sendMessage(tabs[0].id, {
        command: "write",
        textToWrite: this.wordList,
      });
    } catch (error) {
      console.error("Error:", error);
    }
  }

  async sendstop() {
    try {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });

      browser.tabs.sendMessage(tabs[0].id, {
        command: "stopRequest",
      });
    } catch (error) {
      console.error("Error:", error);
    }
  };

  async requestState() {
    while (true) { // so there is a delay before the page script sets up a listener, so we just loop until it starts, gonna fix later
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });

        browser.tabs.sendMessage(tabs[0].id, {
          command: "stateRequest",
        });
        if (this.writingState != {}) {
          return
        }
      } catch (error) {
        console.error("Error:", error);
      }
    }
  }


  setWritingState(state) {
    if (!state) {
      this.button.innerHTML = "Start Typing";
    } else {
      this.button.innerHTML = "Stop Typing";
    }
  }

  async updateWritingState() {
    const currentUUID = this.writingState.uuid
    await this.requestState();
    while (this.writingState.uuid === currentUUID) {
      // Yield to the event loop and wait 50ms before checking again
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    this.setWritingState(this.writingState.currentlyWriting);
  }

  async startTypeClickHandler() {
    this.button.addEventListener("click", async (e) => {
      if (this.writingState.currentlyWriting) {
        await this.sendstop()
        await this.updateWritingState()
      } else if (document.getElementById("text-to-write").value != "") {
        if (e.target.tagName !== "BUTTON" || !e.target.closest("#popup-content")) {
          return;
        }
        this.generateWordlist(true);
        await this.sendMsg();
        await this.updateWritingState();
      } else {
        this.showErr("Need input");
      };
    });
  }

  async stateRequestListener() {
    const runtime = (typeof browser !== 'undefined') ? browser : chrome;
    runtime.runtime.onMessage.addListener((message) => {
      if (message.command === "state") {
        this.writingState = message.state;
        this.setWritingState(this.writingState.currentlyWriting);
      }
    });
  }


  constructor() {
    this.mistake_check.addEventListener("change", (e) => {
      if (this.mistake_check.checked) {
        this.mistake_slider.classList.remove("hidden");
      } else {
        this.mistake_slider.classList.add("hidden");
      }
    })
    this.random_delay_check.addEventListener("change", (e) => {
      if (this.random_delay_check.checked) {
        this.random_delay_slider.classList.remove("hidden");
      } else {
        this.random_delay_slider.classList.add("hidden");
      }
    })

    this.pause_freq_check.addEventListener("change", (e) => {
      if (this.pause_freq_check.checked) {
        this.pause_freq_slider.classList.remove("hidden");
      } else {
        this.pause_freq_slider.classList.add("hidden");
      }
    })

    this.pause_dur_check.addEventListener("change", (e) => {
      if (this.pause_dur_check.checked) {
        this.pause_dur_slider.classList.remove("hidden");
      } else {
        this.pause_dur_slider.classList.add("hidden");
      }
    })

    this.delay_input.addEventListener("input", (e) => {
      const value = this.delay_input.value;
      if (value > 100) {
        this.delay_print.innerHTML = (value - 100) + " seconds";
      } else {
        this.delay_print.innerHTML = value + " milliseconds";
      }
    })

    this.random_delay.addEventListener("input", (e) => {
      this.random_delay_print.innerHTML = " " + this.random_delay.value + " seconds";
    })
    this.pause_freq.addEventListener("input", (e) => {
      this.pause_freq_print.innerHTML = " " + this.pause_freq.value + " words";
    })
    this.pause_dur.addEventListener("input", (e) => {
      this.pause_dur_print.innerHTML = " " + this.pause_dur.value + " minutes";
    })

    this.mistake_input.addEventListener("input", (e) => {
      this.mistake_input_print.innerHTML = " " + this.mistake_input.value + "% intensity";
    })


    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById("text-to-write")) {
        this.textarea.addEventListener('input', () => this.updateHighlights2());
        this.textarea.addEventListener('input', () => this.syncScroll());
        this.textarea.addEventListener('scroll', () => this.syncScroll());
        this.mistake_input.addEventListener("change", () => this.updateHighlights2());
        this.mistake_input.addEventListener("change", () => this.syncScroll());

        this.misspell_check.addEventListener("change", () => this.updateHighlights2());
        this.misspell_check.addEventListener("change", () => this.syncScroll());
        // Initial call to set state
        this.updateHighlights2();
      }
    });

    this.startTypeClickHandler();
    this.stateRequestListener();
    browser.tabs.executeScript({ file: "/pagescript/main.js" });
    this.requestState(); // call without async because we dont care what it returns
  }
}


const popup = new Popup();

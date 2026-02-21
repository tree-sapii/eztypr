
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

  button = document.getElementById("start-type");

  errorBox = document.getElementById("err-dialog");

  wordList = [];

  
  syncScroll() {
    if (!this.textarea || !this.backdrop) return;
    this.backdrop.scrollTop = this.textarea.scrollTop;
    this.backdrop.scrollLeft = this.textarea.scrollLeft;
  }

  applyHighlight(safeText) {
        this.wordList.forEach(word => {
          if (word.misspell || word.mistake) {
            var colorClass = "bg-yellow-300";
            // Escape special regex chars in the WORD itself (in case word is "C++")
            const escapedWord = word.filteredWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // STRICT REGEX:
            // (?<!\w) -> Lookbehind: Must NOT be preceded by a letter/number
            // (?!\w)  -> Lookahead: Must NOT be followed by a letter/number
            // This ensures "packet" matches inside "packet". but "pack" does NOT match inside "packet"
            const regex = new RegExp(`(?<!\\w)(${escapedWord})(?!\\w)`, 'gi');

            if (word.misspell) {
              colorClass = 'bg-red-300'; 
            } 
            //console.log("Applying collor " + colorClass + " to "+ word.filteredWord + "\nOrignal Word " + word.originalword);
            safeText = safeText.replace(regex, `<span class="${colorClass} text-transparent rounded-sm">$1</span>`);
          }  
        });
        return safeText;
      };



  generateWordlist(withDelay = false) {
      let text = this.textarea.value;
      const tempWordList = [];
      if (text == "") text = ".";

      let escapedText = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      escapedText.split(/\s+/).forEach(word => {
        const wordobj = {};
        wordobj.original = word;
        if (!word || word == " ") return; // if word is nothing or space

        const filteredWord = word.length != 1 ? word.replace(/[.,/#!$%^&*;:{}=_`~()"\[\]]/g, " ").trim() : word;
        if (!filteredWord) return; 
        wordobj.filteredWord = filteredWord;
        
        const random = (Math.floor(Math.random() * 100) + 1);
        const intensity_value = (parseInt(this.mistake_input.value)); 
        //Misspell and Mistake Logic
        if (random <= intensity_value)  {
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
      const tabs = await browser.tabs.query({active: true, currentWindow: true});
      console.log(tabs);
      
      browser.tabs.sendMessage(tabs[0].id, {
        command: "write",
        textToWrite: this.wordList,
    });
    } catch(error) {
      console.error("Error:", error);
    }
  }

  async requestState() {
    try {
      const tabs = await browser.tabs.query({active: true, currentWindow: true});
      console.log(tabs);
      
      browser.tabs.sendMessage(tabs[0].id, {
        command: "stateRequest",
    });
    } catch(error) {
      console.error("Error:", error);
    }
  }

  async startTypeClickHandler() {
    this.button.addEventListener("click", async (e) => {
      console.log("click detected");
      if (document.getElementById("text-to-write").value != "") { 
        if (e.target.tagName !== "BUTTON" || !e.target.closest("#popup-content")) {
          return;
        }
        this.generateWordlist(true);
        await this.sendMsg();
      } else {
        this.errorBox.show();
      };
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
        this.random_delay_print.classList.add("hidden");
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
    
    this.mistake_input.addEventListener("input", (e) => {
      this.mistake_input_print.innerHTML = " " + this.mistake_input.value + "% intensity";
    })
      
  
    document.addEventListener('DOMContentLoaded', () => {
      if (document.getElementById("text-to-write")) {
        this.textarea.addEventListener('input', () => this.updateHighlights2());
        this.textarea.addEventListener('input', () =>this.syncScroll());
        this.textarea.addEventListener('scroll',() => this.syncScroll());
        this.mistake_input.addEventListener("change", () => this.updateHighlights2());
        this.mistake_input.addEventListener("change", () => this.syncScroll());

        this.misspell_check.addEventListener("change", () => this.updateHighlights2());
        this.misspell_check.addEventListener("change", () => this.syncScroll());
        // Initial call to set state
        this.updateHighlights2();
      }
    });

    this.startTypeClickHandler(); 
    browser.tabs.executeScript({file: "/main.js"});

  }
}


const popup = new Popup();

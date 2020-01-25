
// Utility class to visualize several (most-recent) lines of text in a given div.
class TextConsole {
  constructor(div_id, max_num_lines = 5) {
    this.console = document.getElementById(div_id);
    this.history = [];
    this.max_num_lines = max_num_lines;
  }

  // Updates text in the div.
  Update(text) {
    this.history.push(text);
    if (this.history.length > this.max_num_lines) {
      this.history.shift();
    }
    this.console.innerHTML = this.history.join('<br>');
  }
};

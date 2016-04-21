
function strInsert(str, char, pos) {
  return str.substring(0, pos) + char + str.substring(pos);
}

function strRemove(str, pos) {
  return str.substring(0, pos-1) + str.substring(pos);
}

function getJSON(url) {
  return new Promise(function(accept, reject) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        accept(JSON.parse(request.responseText));
      } else {
        reject(request.statusText);
      }
    };
    request.onerror = function() {
      reject('Failed to contact server');
    };
    request.send();
  });
}

CLI = {
  // state
  inputBuffer: '',
  cursorPos: 0,
  history: [],
  historyPos: 0,
  inputContainer: null,
  lineContainer: null,
  acceptInput: false,

  // functions
  init: function() {
    document.body.onkeypress = CLI.keyPress;
    document.body.onkeydown = CLI.keyDown;

    CLI.displayPrompt();
  },

  clearConsole: function() {
    document.body.innerHTML = '';
  },

  displayPrompt: function() {
    CLI.inputBuffer = '';
    CLI.cursorPos = 0;

    var container = document.createElement('div');

    var promptContainer = document.createElement('span');
    promptContainer.innerText = CLI.PROMPT;

    container.appendChild(promptContainer);
    document.body.appendChild(container);

    CLI.lineContainer = container;
    CLI.inputContainer = null;

    CLI.renderInput();
    CLI.acceptInput = true;
  },

  appendChar: function(char) {
    CLI.inputBuffer = strInsert(CLI.inputBuffer, char, CLI.cursorPos);
    CLI.cursorPos++;

    CLI.renderInput();
  },

  removeChar: function() {
    if (CLI.cursorPos > 0) {
      CLI.inputBuffer = strRemove(CLI.inputBuffer, CLI.cursorPos);
      CLI.cursorPos--;
      CLI.renderInput();
    }
  },

  moveCursor: function(pos) {
    CLI.cursorPos = pos;
    CLI.renderInput();
  },

  historyBack: function() {
    if (CLI.historyPos > 0 && CLI.history.length > 0) {
      CLI.historyPos--;
      CLI.inputBuffer = CLI.history[CLI.historyPos];
      CLI.cursorPos = CLI.inputBuffer.length;
      CLI.renderInput();
    }
  },

  historyForward: function() {
    if (CLI.historyPos < CLI.history.length) {
      CLI.historyPos++;
      if (CLI.historyPos == CLI.history.length) {
        CLI.inputBuffer = '';
      } else {
        CLI.inputBuffer = CLI.history[CLI.historyPos];
      }
      CLI.cursorPos = CLI.inputBuffer.length;
      CLI.renderInput();
    }
  },

  renderInput: function() {
    if (CLI.inputContainer) {
      CLI.lineContainer.removeChild(CLI.inputContainer);
    }
    var inputContainer = document.createElement('span');
    var chars = (CLI.inputBuffer + ' ').split('');

    chars.forEach(function(char, index) {
      var charSpan = document.createElement('span');
      if (char == ' ') {
        charSpan.innerHTML = '&nbsp;';
      } else {
        charSpan.innerText = char;
      }
      if (index == CLI.cursorPos) {
        charSpan.className = 'cursor';
      }
      inputContainer.appendChild(charSpan);
    });

    CLI.lineContainer.appendChild(inputContainer);
    CLI.inputContainer = inputContainer;

    window.scrollTo(0, document.body.scrollHeight);
  },

  appendOutput: function(output, container) {
    container = container || document.body;
    var outputContainer = document.createElement('div');
    outputContainer.innerText = output;
    container.appendChild(outputContainer);
    window.scrollTo(0, document.body.scrollHeight);
  },

  runCommand: function() {
    // Rerender command without cursor
    CLI.cursorPos = CLI.inputBuffer.length + 1
    CLI.renderInput();

    CLI.history.push(CLI.inputBuffer);
    CLI.historyPos = CLI.history.length;

    // Disallow input during command execution
    CLI.acceptInput = false;

    var subcommands = CLI.inputBuffer.split(/\s+/);
    if (CLI.inputBuffer === '') {
      subcommands = [];
    }
    var valid = CLI.commandHandlers;
    var firstInvalid = null;
    var listPrefix = 'Valid commands:';
    subcommands.forEach(function(command) {
      if (valid) {
        if (typeof valid === 'function' || !(command in valid)) {
          firstInvalid = command;
          valid = null;
        } else {
          valid = valid[command];
          listPrefix = 'Valid subcommands:';
        }
      }
    });

    if (valid) {
      if (typeof valid === 'function') {
        valid();
      } else {
        // List valid subcommands
        var response = listPrefix;
        Object.keys(valid).forEach(function(command) {
          response += ' ' + command;
        });
        CLI.appendOutput(response);
        CLI.displayPrompt();
      }
    } else {
      CLI.appendOutput('Invalid command "' + firstInvalid + '"');
      CLI.displayPrompt();
    }
  },

  // event handlers
  keyDown: function(event) {
    if (event.keyCode in CLI.keySpecial) {
      if (CLI.acceptInput) {
        CLI.keySpecial[event.keyCode]();
      }
      event.preventDefault();
    }
  },
  keyPress: function(event) {
    if (event.charCode && CLI.acceptInput) {
      CLI.appendChar(String.fromCharCode(event.charCode));
    }
  },

  // Special key handlers. prevents default behavior
  keySpecial: {
    8: function() { // Backspace
      CLI.removeChar();
    },
    13: function() { // Enter
      CLI.runCommand();
    },
    37: function() { // Left
      if (CLI.cursorPos > 0) {
        CLI.moveCursor(CLI.cursorPos - 1);
      }
    },
    38: function() { // Up
      CLI.historyBack();
    },
    39: function() { // Right
      if (CLI.cursorPos < CLI.inputBuffer.length) {
        CLI.moveCursor(CLI.cursorPos + 1);
      }
    },
    40: function() { // Down
      CLI.historyForward();
    },
  },

  // command handlers
  commandHandlers: {
    link: {
      nest: function() {
        var container = document.createElement('div');
        document.body.appendChild(container);
        Nest.connectNest(container).then(function(response) {
          if (response.error) {
            return Promise.reject(response.error);
          } else {
            return Promise.resolve(response);
          }
        }).then(function(devices) {
          container.innerHTML = '';
          container.className = 'successContainer';
          CLI.appendOutput('Thermostats', container);
          CLI.appendOutput('-----------', container);
          Object.keys(devices.thermostats).forEach(function(key) {
            CLI.appendOutput(devices.thermostats[key].name_long, container);
          });
          CLI.displayPrompt();
        }).catch(function(err) {
          container.innerHTML = '';
          container.className = 'errorContainer';
          CLI.appendOutput(err, container);
          CLI.displayPrompt();
        });
      }
    },
    clear: function() {
      CLI.clearConsole();
      CLI.displayPrompt();
    },
  },

  // constants
  PROMPT: '$> ',
};

Nest = {
  // state
  hashWaiting: false,
  codeReceived: null,

  // functions
  init: function() {
    /*
     * The Nest API changes the window top location, so I have it redirecting
     * to a hash url, which won't reload the page and will let us handle it.
     */
    window.addEventListener('hashchange', Nest.hashChange)
  },

  connectNest: function(container) {
    return getJSON('/oauth_url').then(function(response) {
      var frame = document.createElement('iframe');
      frame.setAttribute('src', response.url);
      frame.className = 'oauthFrame';
      container.appendChild(frame);
      Nest.hashWaiting = true;
      window.scrollTo(0, document.body.scrollHeight);
      return new Promise(function(accept, reject) {
        Nest.codeReceived = accept;
      });
    }).then(function(code) {
      return getJSON('/oauth_receiver?code=' + code);
    });
  },

  hashChange: function(event) {
    if (Nest.hashWaiting) {
      var match = event.newURL.match(/code=([^&]+)/);
      if (match) {
        var code = match[1];
        var receive = Nest.codeReceived;
        Nest.codeReceived = null;
        Nest.hashWaiting = false;
        receive(code);
      }
    }
    if (window.location.hash != '') {
      window.location.hash = '';
    }
  },
}

document.addEventListener('DOMContentLoaded', function() {
  Nest.init();
  CLI.init();
});

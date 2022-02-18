#!/Users/steve/.nvm/versions/node/v12.10.0/bin/node
const fs = require("fs");

const guesses = [
  "!c!r!a!nE",
  "!hO!u!sE",
  "!mO!v!iE",
  "DODGE"
  ];

console.log("wordle solver");
console.log("  you guessed:");

function isUpperCase(ch) {
  return ch.toUpperCase() == ch;
}

function black(ch) {
   return ({ color: "black", ch });
}

function green(ch) {
   return ({ color: "green", ch });
}

function yellow(ch) {
   return ({ color: "yellow", ch });
}

function parse(guess) {
  let result = [];
  let next_one_is_black = false;
  for (let i =0; i < guess.length; i++) {
    let ch = guess[i];
    if (ch == "!") {
      next_one_is_black = true;
    } else if (next_one_is_black) {
      next_one_is_black =false;
      result.push(black(ch));
    } else if (isUpperCase(ch)) {
      result.push(green(ch.toLowerCase()));
    } else {
      result.push(yellow(ch));
    }
  }
  return result;
}

let word_list = five_letter_words();

// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
let palette = {
  green: "\x1b[42m",
  yellow: "\x1b[43m",
  black: "\x1b[47m",
  reset: "\x1b[0m"
};

function pretty(guess) {
  let parsed = parse(guess);
  let result = "";
  let reset = palette.reset;
  for (let x of parsed) {
    let color = palette[x.color];
    let bit = `${color}${x.ch}${reset}`;
    result += bit;
  }

  return result;
}

for (let guess of guesses) {
  console.log("    " + pretty(guess));
}

function push_ch(arr, ch) {
  if (arr.indexOf(ch) == -1) {
    arr.push(ch);
    arr.sort();
  }
}

function find_matches(game) {
  let result = [];

  // find all the words tht match all the slots
  nextword: for(let word of game.words) {
    for(let i=0; i <5; i++) {
      let slot = game.slots[i];
      let ch = word[i];
      if (!slot.matches(ch)) {
        continue nextword;
      }
    }

    result.push(word);
  }


  return result;
}

function new_slot() { 
  // this can accept anything.
  return ({
      type: "open",
      green_char: null,
      excluded: [],
      toGreen: function(ch) {
        this.type="fixed";
        this.green_char=ch
      },
      exclude: function(ch) {
        push_ch(this.excluded, ch)
      },
      matches: function(ch) {
        switch (this.type) {
          case "open": {
            return this.excluded.indexOf(ch) == -1;
          }
          break;
          case "fixed": {
            return this.green_char == ch;
          }
          break;
        }
        return false;
      },
      toString: function() {
        switch (this.type) {
          case "open": {
            if (this.excluded.length == 0) {
              return "(any)"
            } else {
              return "(!" + this.excluded.join("") + ")"
            }
          }
          break;
          case "fixed": {
            return `(=${this.green_char})`;
          }
          break;
        }
        return this.type
      }
  })
}


let game = ({ 
slots: [
    new_slot(),
    new_slot(),
    new_slot(),
    new_slot(),
    new_slot(),
  ],
  required: [],
  words: word_list
 });

function print_slots(guess, game) {
  console.log(`    ${guess} - the slots are: ${game.slots.map(s => s.toString()).join(" ")}, requires: (${game.required.join("")})`);
}

console.log("  let's process your guesses!");

for (let guess of guesses) {
  let parsed = parse(guess);

  for (let i =0; i < 5; i++) {
    let constraint = parsed[i];
    let slot = game.slots[i];
    if (constraint.color=="green") {
      slot.toGreen(constraint.ch);
    } else if (constraint.color=="yellow") {
      slot.exclude(constraint.ch);
      push_ch(game.required, constraint.ch);
    } else if (constraint.color == "black") {
      for (let slot of game.slots) {
        slot.exclude(constraint.ch);
      }
    }
  }  

  print_slots(pretty(guess), game);

  let matches = find_matches(game);
  

  if (matches.length < 120) {
    console.log(`            there are ${matches.length} options: ${matches.join(", ")}`)
  } else {
    console.log(`            there are ${matches.length} options.`)

  }
  
  console.log("");
}

function five_letter_words() {
  return fs.readFileSync("word-list.txt", "utf-8").split("\n");
}
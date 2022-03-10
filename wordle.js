#!/Users/steve/.nvm/versions/node/v12.10.0/bin/node
const fs = require("fs");

function today_idx() {
  let h1=new Date().setHours(0,0,0,0);
  let h2=new Date('2021-06-19').setHours(0,0,0,0);
  let t= h1-h2;
  return t;
}



function todaysWord(today, day_offset, words) {
  let today_idx = Math.round(today/864e5 - day_offset) % words.length;
  let word = words[today_idx];
  return word
};

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
    if (ch == "!" || ch==".") {
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

  if (result.length != 5) {
    console.log(`${guess} is not a five letter word`);
    process.exit(1);
  }

  return result;
}

function pretty(parsed) {
  let result = "";
  let reset = palette.reset;
  for (let x of parsed) {
    let color = palette[x.color];
    let bit = `${color}${x.ch}${reset}`;
    result += bit;
  }

  return result;
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

function five_letter_words() {
  return fs.readFileSync("word-list.txt", "utf-8").split("\n");
}

function print_slots(guess, game) {
  console.log(`    ${guess} - the slots are: ${game.slots.map(s => s.toString()).join(" ")}, requires: (${game.required.join("")})`);
}

function print_keyboard(game) {
  let kb = "";
  for(let ch='A'; ch<='Z'; ch++) {
    kb += ch;
  }
  console.log(kb);
}

function new_game(word_list) {
  return ({
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

// https://stackoverflow.com/questions/9781218/how-to-change-node-jss-console-font-color
const palette = Object.freeze({
  green: "\x1b[42m",
  yellow: "\x1b[43m",
  black: "\x1b[47m",
  reset: "\x1b[0m"
});

console.log("wordle solver");

let [_a, _b, ...rest] = [...process.argv];
let day_offset=0;
let verbose=false;

let guesses = [];
for (let arg of rest) {
  if (arg.startsWith('--')) {
    if (arg.startsWith('--t')) {
      let digitstr = arg.substring(3);
      let digit = parseInt(digitstr, 10);
      if (digit == NaN) {
        console.log(`${digitstr} is not a number`);
        process.exit(1);
      } else {
        day_offset = digit;
      }
    } else if (arg == "--v") {
      verbose = true;
    }
  } else {
    guesses.push(arg);
  }
}

let word_list = five_letter_words();
let today = today_idx();
let answer = todaysWord(today, day_offset, word_list);

if (verbose) {
  console.log(`The day offset is ${day_offset}`);
  console.log(`Today's index is  ${today}`);
  console.log(`Correct answer is ${answer}`);
}

console.log("  you guessed:");

for (let guess of guesses) {
  console.log("    " + guess);
}

let game = new_game(word_list);

console.log("  let's process your guesses!");

function match(answer, guess) {
  let greens = []
  for (let i =0; i < 5; i++) {
    let answer_ch = answer[i];
    let guess_ch = guess[i];
    if (answer_ch == guess_ch) {
      greens.push(i);
    }
  }

  // yellows are characters in both answer and guess, but not in greens
  let yellows = []
  for (let i =0; i < 5; i++) {
    let guess_ch = guess[i];
    if (answer.includes(guess_ch)) {
      yellows.push(i);
    }
  }

  let result = [];
  for (let i =0; i < 5; i++) {
    let guess_ch = guess[i];
    if (greens.includes(i)) {
      result.push(green(guess_ch));
    } else if (yellows.includes(i)) {
      result.push(yellow(guess_ch));
    } else {
      result.push(black(guess_ch));
    }
  }

  return result;
}

for (let guess of guesses) {
  //let parsed = parse(guess);
  let parsed = match(answer, guess);
  //console.log(parsed);

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

  print_slots(pretty(match(answer, guess)), game);

  let matches = find_matches(game);

  if (matches.length < 120) {
    console.log(`            there are ${matches.length} options: ${matches.join(", ")}`)
  } else {
    console.log(`            there are ${matches.length} options.`)

  }
  
  console.log("");
}

print_keyboard(game);
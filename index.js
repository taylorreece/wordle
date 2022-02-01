import assert from "assert";
import fs from "fs";
import sqlite3 from "better-sqlite3";
import { open } from "sqlite";
import { mean, median, std } from "mathjs";

const words = fs.readFileSync("words.txt").toString().split("\n");
const possibleSolutions = fs
  .readFileSync("solutions.txt")
  .toString()
  .split("\n");

/**
 *
 * @param word - the word to guess (like "perky")
 * @param guess - the guess (like "peers")
 * @returns Green and yellow array of indicators (like ['g', 'g', '-', 'y', '-'])
 */
const makeGuess = (word, guess) => {
  const ret = ["-", "-", "-", "-", "-"];
  let remaining = "";
  for (var i = 0; i < 5; i++) {
    if (word[i] === guess[i]) {
      ret[i] = "g";
    } else {
      remaining += word[i];
    }
  }
  for (var i = 0; i < 5; i++) {
    const loc = remaining.indexOf(guess[i]);
    if (ret[i] !== "g" && loc !== -1) {
      ret[i] = "y";
      remaining = remaining.substring(0, loc) + remaining.substring(loc + 1);
    }
  }
  return ret;
};

assert.deepEqual(makeGuess("abcde", "abcde"), ["g", "g", "g", "g", "g"]);
assert.deepEqual(makeGuess("abcde", "xbcde"), ["-", "g", "g", "g", "g"]);
assert.deepEqual(makeGuess("abcde", "edcba"), ["y", "y", "g", "y", "y"]);
assert.deepEqual(makeGuess("xxxxx", "abcde"), ["-", "-", "-", "-", "-"]);
assert.deepEqual(makeGuess("aabbc", "abcde"), ["g", "y", "y", "-", "-"]);
assert.deepEqual(makeGuess("aaabb", "aabbb"), ["g", "g", "-", "g", "g"]);
assert.deepEqual(makeGuess("perky", "peers"), ["g", "g", "-", "y", "-"]);

/**
 * Determine if the word matches the guess given the pattern
 * @param word - word like "perky"
 * @param guess - word like "peers"
 * @param pattern - like ["g", "g", "-", "y", "-"]
 */
const checkWord = (word, guess, pattern) => {
  let remaining = "";

  for (let i = 0; i < 5; i++) {
    if (pattern[i] === "g") {
      if (guess[i] !== word[i]) {
        return false;
      }
    } else {
      if (guess[i] === word[i]) {
        return false;
      } else {
        remaining += word[i];
      }
    }
  }
  for (let i = 0; i < 5; i++) {
    if (pattern[i] === "y") {
      const loc = remaining.indexOf(guess[i]);
      if (loc === -1) {
        return false;
      } else {
        remaining = remaining.substring(0, loc) + remaining.substring(loc + 1);
      }
    }
  }
  return true;
};

assert(checkWord("abcde", "abcde", ["g", "g", "g", "g", "g"]));
assert(!checkWord("abcde", "abcde", ["g", "g", "g", "g", "y"]));
assert(!checkWord("abcde", "abcde", ["g", "g", "g", "g", "-"]));
assert(checkWord("axxxx", "abcde", ["g", "-", "-", "-", "-"]));
assert(checkWord("abcde", "axxbb", ["g", "-", "-", "y", "-"]));

const db = sqlite3("results.db");

let currentWord = db
  .prepare("SELECT MAX(guess) AS latest FROM guesses")
  .get().latest;

words.forEach((guess, idx) => {
  if (guess <= currentWord) {
    return;
  }
  currentWord = guess;
  let counts = [];
  possibleSolutions.forEach((word) => {
    const pattern = makeGuess(word, guess);
    const matches = possibleSolutions.filter((other) =>
      checkWord(other, guess, pattern)
    );
    counts.push(matches.length);
  });

  const data = {
    guess,
    mean: mean(counts),
    med: median(counts),
    std: std(counts),
  };
  console.log({ data });
  console.log(`${(idx * 100.0) / words.length}% done.`);
  db.prepare(
    "INSERT INTO guesses (guess, mean, med, std) VALUES (@guess, @mean, @med, @std)"
  ).run(data);
});

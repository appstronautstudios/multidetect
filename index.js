import cld from 'cld';
import LanguageDetect from 'languagedetect';
import { francAll } from 'franc';
import getCountryISO2 from 'country-iso-3-to-2';

async function detectSingleViaCLD(title) {
    return new Promise((resolve, reject) => {
        cld.detect(title)
            .then((results) => {
                if (results != null && results.languages != null && results.languages.length > 0) {
                    return resolve(results.languages);
                } else {
                    throw new Error("null results");
                }
            })
            .catch((e) => {
                return resolve([]);
            });
    });
}

async function detectSingleViaLanguageDetect(title) {
    return new Promise((resolve, reject) => {
        let detector = new LanguageDetect();
        detector.setLanguageType("iso2");
        let results = detector.detect(title);
        if (results != null && results.length > 0) {
            let output = [];
            for (let result of results) {
                let iso = result[0];
                let confidence = result[1] * 100;
                if (iso != null && iso != "null") {
                    output.push({
                        code: iso,
                        percent: confidence
                    });
                }
            }
            return resolve(output);
        } else {
            return resolve([]);
        }
    });
}

async function detectSingleViaFranc(title) {
    return new Promise((resolve, reject) => {
        let results = francAll(title);
        if (results != null && results.length > 0) {
            let output = [];
            for (let result of results) {
                let iso = getCountryISO2(result[0].toUpperCase());
                let confidence = result[1] * 100;
                if (iso != null && iso != "null") {
                    output.push({
                        code: iso.toLowerCase(),
                        percent: confidence
                    });
                }
            }
            return resolve(output);
        } else {
            return resolve([]);
        }
    });
}

function mergeResults(resultArrays) {
    let output = [];
    let dict = {};
    for (let resultArray of resultArrays) {
        for (let result of resultArray) {
            let code = result.code;
            let percent = result.percent;
            if (dict[code] == null || dict[code] < percent) {
                dict[code] = percent
            }
        }
    }
    // convert back to array format
    for (let key of Object.keys(dict)) {
        output.push({
            code: key,
            percent: dict[key]
        });
    }
    // done
    return output;
}

/**
 * Iterates through inputs and and performs chosen language detection against it.
 * @param {*} inputs strings to detect against
 * @param {*} method detection lib to use. Options are "cld", "ld", "franc"
 * @returns array of results corresponding to the inputs in the following format [{code:ISO, percent:FLOAT}, ...]
 */
export async function languageConfidence(inputs, method) {
    return new Promise((resolve, reject) => {
        let promises = [];
        for (let input of inputs) {
            if (method == "cld") {
                promises.push(detectSingleViaCLD(input));
            } else if (method == "ld") {
                promises.push(detectSingleViaLanguageDetect(input));
            } else if (method == "franc") {
                promises.push(detectSingleViaFranc(input));
            } else {
                return reject("unexpected method code");
            }
        }
        Promise.all(promises).then((results) => {
            return resolve(results);
        });
    });
}

/**
 * Similar to languageConfidence except it performs ALL supported language detection methods and records the BEST
 * confidence for each language detected in each input string
 * @param {*} inputs strings to detect against
 * @returns array of results corresponding to the inputs in the following format [{code:ISO, percent:FLOAT}, ...]
 */
export async function languageConfidenceAll(inputs) {
    let cldResults = await languageConfidence(inputs, "cld");
    let languageDetectResults = await languageConfidence(inputs, "ld");
    let francResults = await languageConfidence(inputs, "franc");
    let output = [];
    for (let i = 0; i < inputs.length; i++) {
        let inputDetection = mergeResults([cldResults[i], languageDetectResults[i], francResults[i]]);
        output.push(inputDetection);
    }
    return output;
}

/**
 * Given a set of inputs, checks to see if string matches your expected language. To cut down on false negatives
 * and false positives this will only return TRUE if a language is detected above your provided threshold AND
 * that language is not your expected language AND your expected language is not also above threshold. This final
 * check is performed because some languages have a lot of mutually intelligible words and phrases.
 * @param {*} inputs strings to detect against
 * @param {*} expected ISO-2 code of expected language
 * @param {*} treshold minimum percent threshold for a match to be considered valid
 * @returns array of booleans corresponding to the inputs indicating if there was a mismatch or not
 */
export async function languageMismatch(inputs, expected, threshold) {
    let mismatches = [];
    let results = await languageConfidenceAll(inputs);
    for (let result of results) {
        let expectedMatch = false;
        let unexpectedMatch = false;
        for (let language of result) {
            if (language.percent > threshold) {
                if (language.code == expected) expectedMatch = true;
                else unexpectedMatch = true;
            }
        }
        mismatches.push(unexpectedMatch && !expectedMatch);
    }
    return mismatches;
}

async function testIndividual(testSet) {
    const DIVIDER = "==========";
    const THRESHOLD = 75;
    let cloudTranslate = null;
    let cldResults = null;
    let languageDetectResults = null;
    let francResults = null;
    console.log(DIVIDER);
    console.log("trying cloud translate");
    try {
        // cloudTranslate = await getGoogleLanaguageDetection(testSet);
    } catch (e) {
        console.log(e);
    }
    console.log("trying cld");
    cldResults = await languageConfidence(testSet, "ru", "cld");
    console.log("trying languagedetect");
    languageDetectResults = await languageConfidence(testSet, "ru", "ld");
    console.log("trying franc");
    francResults = await languageConfidence(testSet, "ru", "franc");
    // compile
    console.log(DIVIDER);
    let cloudTranslateSuccesses = 0;
    let cldSuccessess = 0;
    let ldSuccesses = 0;
    let francSuccesses = 0;
    let allSuccesses = 0;
    for (let i = 0; i < testSet.length; i++) {
        console.log(testSet[i]);
        // let ctSuccess = (cloudTranslate[i].code.startsWith("ru") && cloudTranslate[i].percent > THRESHOLD);
        let cldSuccess = (cldResults[i].code != null && cldResults[i].percent > THRESHOLD);
        let ldSuccess = (languageDetectResults[i].code != null && languageDetectResults[i].percent > THRESHOLD);
        let francSuccess = (francResults[i].code != null && francResults[i].percent > THRESHOLD);
        // console.log("ct success = " + ctSuccess);
        console.log("cld  success = " + cldSuccess);
        console.log("ld success = " + ldSuccess);
        console.log("franc success = " + francSuccess);
        console.log("ALL success = " + (cldSuccess || ldSuccess || francSuccess));
        // if (ctSuccess) cloudTranslateSuccesses++;
        if (cldSuccess) cldSuccessess++;
        if (ldSuccess) ldSuccesses++;
        if (francSuccess) francSuccesses++;
        if (cldSuccess || ldSuccess || francSuccess) allSuccesses++;
        console.log(DIVIDER);
    }
    console.log("ct rate: " + cloudTranslateSuccesses / testSet.length);
    console.log("cld rate: " + cldSuccessess / testSet.length);
    console.log("ld rate: " + ldSuccesses / testSet.length);
    console.log("franc rate: " + francSuccesses / testSet.length);
    console.log("all rate: " + allSuccesses / testSet.length);
}

async function testAll(testSet) {
    console.log(testSet);
    let results = await languageConfidenceAll(testSet);
    console.log(results);
    let mismatches = await languageMismatch(testSet, "ru", 75)
    console.log(mismatches);
}

// testIndividual(["Он уже накопил,алло стример"]);
// testAll([
//     "ФИДЕРЫ",
//     "Челка мешат",
//     "C 3000 до 6000 ЗА 5 ДНЕЙ ЛИБО НОВАЯ СТРИЖКА (ДЕНЬ4 3500)",
//     "Он уже накопил,алло стример",
//     "ГДЕ Я БЛЯТЬ?",
//     "типичный шейкер в твоей команде",
//     "Фо рил",
//     "ВП - сосалка",
//     "Попытка номер STO",
//     "ВОДУ ПИЛ",
//     "в трон по гофру",
//     "rfhmjкарточку",
//     "чтоооо топ 1 морф задоджил дум...",
//     "Познавательный донат",
//     "roma..",
//     "TORONTOTOKYO?",
//     "понесло",
//     "плачу на техно feat. rainypa1n",
//     "0 помощи блядь НОЛЬ ПОМОЩИИИ!",
//     "обмоханый",
//     "Pourriez-vous m'aider?",
//     "This is an english sentence"
// ]);
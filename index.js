import cld from 'cld';
import LanguageDetect from 'languagedetect';
import { franc, francAll } from 'franc';
import getCountryISO2 from 'country-iso-3-to-2';

async function detectSingleViaCLD(title) {
    // promise resolve is in format {code:ISO, percent:confidence%}
    // promise reject is error code. Not meeting min confidence is a reject as well
    return new Promise((resolve, reject) => {
        // language check on titles. We do this in lieu of proper language settings. A lot of streamers
        // skip over changing their language and mark it as "en" which creates really bad multi-lingual content
        cld.detect(title)
            .then((results) => {
                if (results != null && results.languages != null && results.languages.length > 0) {
                    let bestMatch = results.languages[0];
                    return resolve(bestMatch);
                }
                else {
                    throw new Error("null results");
                }
            })
            .catch((e) => {
                return resolve({ code: "xx", percent: 0 });
            });
    });
}

export async function detectLanguageViaCLD(titles) {
    return new Promise((resolve, reject) => {
        let promises = [];
        for (let title of titles) {
            promises.push(detectSingleViaCLD(title));
        }
        Promise.all(promises).then((results) => {
            for (let i = 0; i < results.length; i++) {
                if (results[i] == null) continue;
                results[i].text = titles[i];
            }
            return resolve(results);
        });
    });
}

async function detectSingleViaLanguageDetect(title) {
    return new Promise((resolve, reject) => {
        let detector = new LanguageDetect();
        detector.setLanguageType("iso2");
        let results = detector.detect(title);
        if (results != null && results.length > 0) {
            let bestMatch = results[0];
            let iso = bestMatch[0];
            let confidence = bestMatch[1] * 100;
            if (iso == null || iso == "null") {
                throw new Error("confident language is null?");
            } else {
                return resolve({
                    code: iso,
                    percent: confidence
                });
            }
        } else {
            return resolve(null);
        }
    });
}

export async function detectLanguageViaLanguageDetect(titles) {
    return new Promise((resolve, reject) => {
        let promises = [];
        for (let title of titles) {
            promises.push(detectSingleViaLanguageDetect(title));
        }
        Promise.all(promises).then((results) => {
            for (let i = 0; i < results.length; i++) {
                if (results[i] == null) continue;
                results[i].text = titles[i];
            }
            return resolve(results);
        });
    });
}

async function detectSingleViaFranc(title) {
    return new Promise((resolve, reject) => {
        let results = franc(title);
        let iso = getCountryISO2(results.toUpperCase());
        if (iso == null || iso == "null") iso = "un";
        iso = iso.toLowerCase();
        let confidence = 100;
        return resolve({
            code: iso,
            percent: confidence
        });
    });
}

export async function detectLanguageViaFranc(titles) {
    return new Promise((resolve, reject) => {
        let promises = [];
        for (let title of titles) {
            promises.push(detectSingleViaFranc(title));
        }
        Promise.all(promises).then((results) => {
            for (let i = 0; i < results.length; i++) {
                if (results[i] == null) continue;
                results[i].text = titles[i];
            }
            return resolve(results);
        });
    });
}

async function test(testSet) {
    const DIVIDER = "==========";
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
    try {
        cldResults = await detectLanguageViaCLD(testSet);
    } catch (e) {
        console.log(e);
    }
    console.log("trying languagedetect");
    try {
        languageDetectResults = await detectLanguageViaLanguageDetect(testSet);
    } catch (e) {
        console.log(e);
    }
    console.log("trying franc");
    try {
        francResults = await detectLanguageViaFranc(testSet);
    } catch (e) {
        console.log(e);
    }
    // compile
    console.log(DIVIDER);
    let cloudTranslateSuccesses = 0;
    let cldSuccessess = 0;
    let ldSuccesses = 0;
    let francSuccesses = 0;
    let allSuccesses = 0;
    for (let i = 0; i < testSet.length; i++) {
        console.log(testSet[i]);
        // let ctSuccess = (cloudTranslate[i].code.startsWith("ru") && cloudTranslate[i].percent > (75));
        let cldSuccess = (cldResults[i].code.startsWith("ru") && cldResults[i].percent > (75));
        let ldSuccess = (languageDetectResults[i].code.startsWith("ru") && languageDetectResults[i].percent > (75));
        let francSuccess = francResults[i].code.startsWith("ru");
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
test([
    "ФИДЕРЫ",
    "Челка мешат",
    "C 3000 до 6000 ЗА 5 ДНЕЙ ЛИБО НОВАЯ СТРИЖКА (ДЕНЬ4 3500)",
    "Он уже накопил,алло стример",
    "ГДЕ Я БЛЯТЬ?",
    "типичный шейкер в твоей команде",
    "Фо рил",
    "ВП - сосалка",
    "Попытка номер STO",
    "ВОДУ ПИЛ",
    "в трон по гофру",
    "rfhmjкарточку",
    "чтоооо топ 1 морф задоджил дум...",
    "Познавательный донат",
    "roma..",
    "TORONTOTOKYO?",
    "понесло",
    "плачу на техно feat. rainypa1n",
    "0 помощи блядь НОЛЬ ПОМОЩИИИ!",
    "обмоханый"
]);
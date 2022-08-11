import { useRef, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useArrayState } from "react-use-object-state";
import Swal from 'sweetalert2';
import 'core-js/stable';
import { Howl } from 'howler';
import clsx from 'classnames';

function getRandomIntInclusive(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1) + min); //The maximum is inclusive and the minimum is inclusive
}

const correctSound = new Howl({
    src: ['correct.mp3']
});

const incorrectSound = new Howl({
    src: ['incorrect.mp3']
});

const backgroundSong = new Howl({
    src: ['thinking.mp3'],
    loop: true
});

const powerupSound = new Howl({
    src: ['powerup.mp3']
});

const youWinSound = new Howl({
    src: ['youwin.mp3']
});



const questionSide = "definitions";
const answerSide = "terms";

/**
 * Shuffles array in place.
 * @param {Array} a items An array containing the items.
 */
 function shuffle(a) {
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function selectAnswers(currentQuestionIndex: number): string[] {
    let answers = [];
    answers.push((window as any)[answerSide][currentQuestionIndex]);
    let foundIndexes = [];
    for(let i = 0; i < Math.min(3, (window as any)[answerSide].length - 1); i++) {
        let index = 0;
        do {
            index = getRandomIntInclusive(0, (window as any)[answerSide].length - 1);
        } while(index == currentQuestionIndex || foundIndexes.indexOf(index) != -1);
        foundIndexes.push(index);
        answers.push((window as any)[answerSide][index]);
    }
    shuffle(answers);
    return answers;
}

enum GameState {
    ANSWERING_QUESTIONS,
    FINISHED_QUESTIONS,
    USING_LIFELINE,
    FAILED
}

enum Lifeline {
    ASK_THE_AUDIENCE,
    FIFTY_FIFTY,
    DOUBLE_DIP,
    JUMP_THE_QUESTION
}

function formatCurrency(num: number) {
    if(typeof num != 'number')
        return "---";
    return "$" + num.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
const MAX_QUESTIONS = 15;
const questionValues = [
    100,
    200,
    300,
    500,
    1000,
    2000,
    4000,
    8000,
    16000,
    32000,
    64000,
    125000,
    250000,
    500000,
    1000000
]

function getParameterByName( name ){
    name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
    let regexS = "[\\?&]"+name+"=([^&#]*)";
    let regex = new RegExp( regexS );
    let results = regex.exec( window.location.href );
    if( results == null )
      return "";
    else
      return decodeURIComponent(results[1].replace(/\+/g, " "));
}

async function askAudience(options: string[], correctAnswer: string) {
    await Swal.fire({
        title: 'Ask the Audience',
        text: 'The audience is voting...',
        imageUrl: 'ripple.gif',
        showConfirmButton: false,
        allowOutsideClick: false,
        timer: 5000,
        timerProgressBar: true
    });
    let audienceCorrect = Math.random();
    let audienceChoices = [];
    for(let i = 0; i < options.length; i++) {
        audienceChoices[i] = 0;
    }
    let correctIndex = options.indexOf(correctAnswer);
    let incorrectIndex;
    do {
        incorrectIndex = getRandomIntInclusive(0, options.length - 1);
    } while(incorrectIndex == correctIndex);
    let incorrectIndexOther;
    if(options.length > 2) {
        do {
            incorrectIndexOther = getRandomIntInclusive(0, options.length - 1);
        } while(incorrectIndexOther == correctIndex || incorrectIndexOther == incorrectIndex);
    } else
        incorrectIndexOther = incorrectIndex;
    let incorrectPercentageSplit = 0.4 + (Math.random() / 5);
    const AUDIENCE_NUM = getRandomIntInclusive(10, 500);
    for(let i = 0; i < AUDIENCE_NUM; i++) {
        let chosenIndex;
        if(Math.random() <= audienceCorrect) {
            chosenIndex = correctIndex;
        } else {
            if(true) {
                if(Math.random() <= incorrectPercentageSplit)
                    chosenIndex = incorrectIndex;
                else
                    chosenIndex = incorrectIndexOther;
            } else {
                do {
                    chosenIndex = getRandomIntInclusive(0, options.length - 1);
                } while(chosenIndex == correctIndex);
            }
        }
        audienceChoices[chosenIndex]++;
    }
    const voteDivs = audienceChoices.map((num, i) => {
        const percent = (num / AUDIENCE_NUM) * 100;
        return `<tr><td class="fitwidth">${options[i]}</td><td><div class="vote-tally-bar" style="width: ${percent}%;">${Math.round(percent)}%</div></td></tr>`;
    })
    await Swal.fire({
        title: 'Ask the Audience',
        html: `<p>Your audience size: ${AUDIENCE_NUM}</p>
        <table class="vote-tally">
            ${voteDivs.join("")}
        </table>
        `,
        showConfirmButton: true,
        allowOutsideClick: true,
    });
}

function LifelineButton(props: { children: any; disabled?: boolean; lifeline: Lifeline; onClick: (l: Lifeline) => void; usedList: Lifeline[]; }) {
    const onClick = () => {
        props.onClick(props.lifeline);
    };
    return <button
        disabled={props.usedList.indexOf(props.lifeline) != -1 || (props.disabled === true)}
        className="question-answer-button"
        onClick={onClick}>
            {props.children}
    </button>;
}

function openLifelineGuide(e) {
    e.preventDefault();
    Swal.fire({
        title: 'Lifelines',
        html: `
        <p>Lifelines can be used to help you answer a tough question. They can each only be used once.</p>
        <p>Additionally, the 50:50 lifeline cannot be used after Double Dip is activated for a question. Use them in
        the opposite order if you wish to do this.</p>
        <p>The available lifelines are:</p>
        <ul class="lifeline-list">
            <li><strong>Double Dip</strong>: Gives you two tries on a question. This does not carry over to the next question.</li>
            <li><strong>50:50</strong>: Removes two of the incorrect answers, leaving you with a 50% chance of getting the question right.</li>
            <li><strong>Ask the Audience</strong>: Have the (virtual) audience vote on what answer is correct. They may or may not be right.</li>
            <li><strong>Jump the Question</strong>: Skip a question entirely.</li>
        </ul>
        `
    })
}

const MoneyTowerEntry = (props) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if(ref.current != null) {
            ref.current.scrollIntoView({
                behavior: "smooth"
            });
        }
    }, [ props.currentQuestionIndex ]);
    return <div ref={ref} className={clsx("money-tower-entry", (props.currentQuestionIndex)==(questionValues.length-1-props.index) && "money-tower-entry-current")}>
        <span className="money-tower-question-number">{questionValues.length-props.index}</span>
        <span className="money-tower-value">{formatCurrency(props.value)}</span>
    </div>;
};
function App() {
    const [ currentGameState, setCurrentGameState ] = useState(GameState.ANSWERING_QUESTIONS);
    const [ scriptProcessed, setScriptProcessed ] = useState(false);
    const [ currentQuestionIndex, setCurrentQuestionIndex ] = useState(0);
    const [ currentMoney, setCurrentMoney ] = useState(0);
    const [ readyToStart, setShowReadyToStart ] = useState(false);
    const [ answers, setAnswers ] = useState(null);
    const [ activeLifeline, setActiveLifeline ] = useState<Lifeline>(null);
    const [ doubleDippedAnswer, setDoubleDippedAnswer ] = useState(null);
    const [ protectedDoubleDip, setProtectedDoubleDip ] = useState(false);
    const [ thatWasCorrect, setThatWasCorrect ] = useState(false);
    const usedLifelineTypes = useArrayState<Lifeline>([]);
    const questionValue = questionValues[currentQuestionIndex];
    const answerSideArray = (window as any)[answerSide];
    const correctAnswer = typeof answerSideArray != 'undefined' ? answerSideArray[currentQuestionIndex] : false;
    const clearLifeline = () => {
        setActiveLifeline(null);
    }
    const onAnswerClick = (answer) => {
        const isCorrect = (correctAnswer == answer);
        if(isCorrect)
            correctSound.play();
        else
            incorrectSound.play();
        backgroundSong.pause();
        if(isCorrect) {
            setCurrentMoney(questionValue);
            setThatWasCorrect(true);
        } else if(protectedDoubleDip) {
            setDoubleDippedAnswer(answer);
            setProtectedDoubleDip(false);
            Swal.fire({
                title: 'Double Dip',
                text: "Oops.. that wasn't the right answer! Fortunately, you get a chance to try again."
            });
        } else {
            setCurrentGameState(GameState.FAILED);
        }
    };
    useEffect(() => {
        if(thatWasCorrect) {
            var t = setTimeout(() => {
                setThatWasCorrect(false);
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                backgroundSong.seek(0);
                backgroundSong.play();
            }, 2000);
            return () => clearTimeout(t);
        }
    }, [ thatWasCorrect, currentQuestionIndex ]);
    const useLifeline = (lifeline: Lifeline) => {
        setActiveLifeline(lifeline);
    };
    const playAgain = () => {
        setCurrentQuestionIndex(0);
        backgroundSong.seek(0);
        backgroundSong.play();
        setCurrentGameState(GameState.ANSWERING_QUESTIONS);
        setCurrentMoney(0);
        setProtectedDoubleDip(false);
        setDoubleDippedAnswer(null);
        usedLifelineTypes.setState([]);
    };
    const startGame = () => {
        setShowReadyToStart(false);
        setScriptProcessed(true);
        playAgain();
    }
    useEffect(() => {
        setDoubleDippedAnswer(null);
        setProtectedDoubleDip(false);
    }, [ currentQuestionIndex ]);
    useEffect(() => {
        if(activeLifeline != null) {
            usedLifelineTypes.push(activeLifeline);
            powerupSound.play();
            switch(activeLifeline) {
                case Lifeline.ASK_THE_AUDIENCE:
                    askAudience(answers, correctAnswer).then(clearLifeline);
                    break;
                case Lifeline.JUMP_THE_QUESTION:
                    setCurrentQuestionIndex(currentQuestionIndex+1);
                    Swal.fire({title: 'Jump the Question', text: 'You have skipped that question!'}).then(clearLifeline);
                    break;
                case Lifeline.FIFTY_FIFTY:
                    setAnswers(shuffle([ answers.filter(answer => correctAnswer != answer)[0], correctAnswer ]));
                    Swal.fire({title: '50:50', text: 'Two incorrect answers were removed! You now have a 50% chance of getting this right if you guess.'}).then(clearLifeline);
                    break;
                case Lifeline.DOUBLE_DIP:
                    setProtectedDoubleDip(true);
                    Swal.fire({title: 'Double Dip', text: 'If you get this question wrong, you will be given another chance to answer.'}).then(clearLifeline);
                    break;
            }
        }
    }, [ activeLifeline ]);
    useEffect(() => {
        if(currentGameState == GameState.ANSWERING_QUESTIONS && scriptProcessed) {
            if(currentQuestionIndex < Math.min((window as any)[questionSide].length, MAX_QUESTIONS)) {
                setAnswers(selectAnswers(currentQuestionIndex));
            } else {
                youWinSound.play();
                setCurrentGameState(GameState.FINISHED_QUESTIONS);
            }
        }
    }, [ currentQuestionIndex, scriptProcessed, currentGameState ]);
    useEffect(() => {
        const src = getParameterByName("quizscript");
        if(src == null) {
            Swal.fire({
                title: 'Error',
                text: "A source script must be provided in the 'quizscript' parameter.",
                icon: "error"
            });
        } else {
            const script = document.createElement("script");
            script.onload = () => {
                /* Backwards compatibility */
                (window as any).terms = (window as any).questions.map(q => q.question);
                (window as any).definitions = (window as any).questions.map(q => q.answers[0]);
                setShowReadyToStart(true);
            }

            script.src = src + (src.includes("?") ? "&" : "?") + "type=objectarray";
            script.async = true;
        
            document.body.appendChild(script);
        }
        
    }, []);
    let mainApp = null;
    if(activeLifeline != null) {
        return null;
    } else if(currentGameState == GameState.FAILED) {
        return <div className="message">
            <h3>Uh oh! That wasn't the right answer.</h3>
            <h4>Your total earnings are: <b>{formatCurrency(currentMoney)}</b></h4>
            <button className="question-answer-button" onClick={playAgain}>Play again</button>
        </div>;
    } else if(currentGameState == GameState.FINISHED_QUESTIONS) {
        return <div className="message">
            <h3>Congratulations! You are now a millionaire!</h3>
            <p></p>
            <img className="decoration-image" src="moneybag.png"/>
        </div>;
    }
    if(scriptProcessed) {
        mainApp = <>
            <div className="main-app">
                <div className="question-side">
                    <div className="question-term-container">
                        <div className="question-answer-button question-answer-button-with-background question-term">
                            {(currentQuestionIndex+1) + ". " + (window as any)[questionSide][currentQuestionIndex]}
                        </div>
                    </div>
                    <div className="question-options">
                        {answers?.map((answer, i) => <button disabled={doubleDippedAnswer == answer || thatWasCorrect} key={answer} className={clsx("question-answer-button", "question-answer-button-with-background", doubleDippedAnswer == answer && "question-answer-double-dipped", thatWasCorrect && correctAnswer == answer && "question-answer-was-correct")} onClick={onAnswerClick.bind(void 0, answer)}>
                            <span className="answer-letter">{String.fromCharCode('A'.charCodeAt(0) + i) + ':'}</span>&nbsp;<span className="answer-content">{answer}</span>
                        </button>)}
                    </div>
                    <p></p>
                    <p></p>
                    <h4 className="lifeline-note">Having trouble? Click one of the buttons below to use a lifeline (<a href="#" onClick={openLifelineGuide}>open guide</a>).</h4>
                    <div className="lifeline-options">
                        <LifelineButton disabled={thatWasCorrect} usedList={usedLifelineTypes.state} lifeline={Lifeline.ASK_THE_AUDIENCE} onClick={useLifeline}>Ask the Audience</LifelineButton>
                        <LifelineButton disabled={thatWasCorrect || protectedDoubleDip || doubleDippedAnswer != null} usedList={usedLifelineTypes.state} lifeline={Lifeline.FIFTY_FIFTY} onClick={useLifeline}>50:50</LifelineButton>
                        <LifelineButton disabled={thatWasCorrect} usedList={usedLifelineTypes.state} lifeline={Lifeline.DOUBLE_DIP} onClick={useLifeline}>Double Dip</LifelineButton>
                        <LifelineButton disabled={thatWasCorrect} usedList={usedLifelineTypes.state} lifeline={Lifeline.JUMP_THE_QUESTION} onClick={useLifeline}>Jump The Question</LifelineButton>
                    </div>
                    <p></p>
                </div>
                <div className="money-tower-container">
                    <div className="money-tower">
                        {questionValues.slice().reverse().map((value, i) => <MoneyTowerEntry key={i} index={i} value={value} currentQuestionIndex={currentQuestionIndex}/>)}
                    </div>
                </div>
            </div>
        </>;
    }
    return <>
        {mainApp}
        {mainApp == null && <div className="message">
            <h1 className="lifeline-note" style={{width: "100%"}}>Who Wants To Be a Millionaire?</h1>
            <button disabled={!readyToStart} onClick={startGame} className="question-answer-button get-started-button">Get started!</button>
        </div>}
    </>;
}

ReactDOM.render(<App/>, document.getElementById("game-container"));
let unfollowCount = 0;
let skipCount = 0;
const PAUSE_AFTER = 50;
const PAUSE_DURATION = 300000;
const TARGET_UNFOLLOWS = 200;
const PROTECT_MUTUAL_FOLLOWERS = true;

function drawProgressBar(current, target, width = 40) {
    const percentage = Math.min((current / target) * 100, 100);
    const filledWidth = Math.floor((current / target) * width);
    const emptyWidth = width - filledWidth;
    const filledBar = '█'.repeat(filledWidth);
    const emptyBar = '░'.repeat(emptyWidth);
    
    return {
        bar: filledBar + emptyBar,
        percentage: percentage.toFixed(1),
        current: current,
        target: target
    };
}

function displayStats() {
    const progress = drawProgressBar(unfollowCount, TARGET_UNFOLLOWS);
    const nextPause = Math.ceil(unfollowCount / PAUSE_AFTER) * PAUSE_AFTER;
    const untilPause = nextPause - unfollowCount;
    
    console.clear();
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         TWITTER UNFOLLOW AUTOMATION v2.2                      ║
╚═══════════════════════════════════════════════════════════════╝

📊 ПРОГРЕСС
   [${progress.bar}] ${progress.percentage}%
   ${progress.current} / ${progress.target} отписок

📈 СТАТИСТИКА
   ✅ Отписано:          ${unfollowCount}
   ⏭️  Пропущено:        ${skipCount}
   📝 Всего обработано:  ${unfollowCount + skipCount}
   ⚡ Успешность:        ${(unfollowCount + skipCount) > 0 ? ((unfollowCount / (unfollowCount + skipCount)) * 100).toFixed(1) : 0}%

⏸️  СЛЕДУЮЩАЯ ПАУЗА
   Через ${untilPause} отписок (на ${nextPause})

⏱️  ВРЕМЯ: ${new Date().toLocaleTimeString()}

🎯 СТАТУС: ${unfollowCount >= TARGET_UNFOLLOWS ? '✅ ЦЕЛЬ ДОСТИГНУТА!' : '🔄 РАБОТАЕТ...'}
    `);
}

function playBeep(frequency = 800, duration = 200) {
    try {
        let audioContext = new (window.AudioContext || window.webkitAudioContext)();
        let oscillator = audioContext.createOscillator();
        let gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), duration);
    } catch (e) {}
}

function removeProcessedButton(button) {
    let userCell = button.closest('[data-testid="UserCell"]') || 
                   button.closest('div[data-testid$="-cell"]') ||
                   button.closest('article') ||
                   button.parentElement.parentElement.parentElement;
    
    if (userCell) {
        userCell.style.opacity = '0.5';
        userCell.style.pointerEvents = 'none';
        setTimeout(() => userCell.remove(), 500);
    }
}

function unfollowWithFilter() {
    if (unfollowCount >= TARGET_UNFOLLOWS) {
        displayStats();
        playBeep(1000, 500);
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🎉 ЦЕЛЬ ДОСТИГНУТА! 🎉                     ║
╠═══════════════════════════════════════════════════════════════╣
║  Всего отписано:   ${unfollowCount}
║  Всего пропущено:  ${skipCount}
║  Всего обработано: ${unfollowCount + skipCount}
╚═══════════════════════════════════════════════════════════════╝
        `);
        return;
    }
    
    if (unfollowCount > 0 && unfollowCount % PAUSE_AFTER === 0) {
        displayStats();
        playBeep(600, 300);
        
        const resumeTime = new Date(Date.now() + PAUSE_DURATION);
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    ⏸️  АВТОМАТИЧЕСКАЯ ПАУЗА ⏸️                 ║
╠═══════════════════════════════════════════════════════════════╣
║  Длительность:     ${PAUSE_DURATION / 60000} минут
║  Возобновление:    ${resumeTime.toLocaleTimeString()}
║  Прогресс:         ${unfollowCount}/${TARGET_UNFOLLOWS}
╚═══════════════════════════════════════════════════════════════╝
        `);
        
        let remainingSeconds = PAUSE_DURATION / 1000;
        const countdownInterval = setInterval(() => {
            remainingSeconds--;
            const minutes = Math.floor(remainingSeconds / 60);
            const seconds = remainingSeconds % 60;
            console.log(`⏳ Возобновление через: ${minutes}м ${seconds}с...`);
            
            if (remainingSeconds <= 0) clearInterval(countdownInterval);
        }, 1000);
        
        unfollowTimeout = setTimeout(() => {
            clearInterval(countdownInterval);
            playBeep(1000, 300);
            unfollowWithFilter();
        }, PAUSE_DURATION);
        return;
    }
    
    let confirmButton = document.querySelector('[data-testid="confirmationSheetConfirm"]');
    
    if (confirmButton) {
        confirmButton.click();
        unfollowCount++;
        displayStats();
        
        unfollowTimeout = setTimeout(unfollowWithFilter, Math.floor(Math.random() * 2001) + 3000);
        return;
    }
    
    let unfollowButtons = document.querySelectorAll('[data-testid$="-unfollow"]');
    
    if (unfollowButtons.length === 0) {
        window.scrollBy(0, 1000);
        unfollowTimeout = setTimeout(unfollowWithFilter, Math.floor(Math.random() * 2001) + 3000);
        return;
    }
    
    let button = unfollowButtons[0];
    
    if (PROTECT_MUTUAL_FOLLOWERS) {
        let userContainer = button.closest('[data-testid="UserCell"]') || 
                           button.closest('div[data-testid$="-cell"]') ||
                           button.closest('article') ||
                           button.parentElement.parentElement.parentElement;
        
        if (userContainer) {
            let allText = userContainer.innerText || userContainer.textContent || '';
            let isFollowingBack = allText.includes('Follows you') || 
                                 allText.includes('Подписан') ||
                                 allText.includes('Подписана') ||
                                 allText.includes('Читает вас');
            
            if (isFollowingBack) {
                skipCount++;
                removeProcessedButton(button);
                displayStats();
                unfollowTimeout = setTimeout(unfollowWithFilter, Math.floor(Math.random() * 2001) + 3000);
                return;
            }
        }
    }
    
    button.click();
    removeProcessedButton(button);
    displayStats();
    
    unfollowTimeout = setTimeout(unfollowWithFilter, Math.floor(Math.random() * 2001) + 3000);
}

function stopScript() {
    clearTimeout(unfollowTimeout);
    displayStats();
    playBeep(400, 500);
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🛑 СКРИПТ ОСТАНОВЛЕН 🛑                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Всего отписано:   ${unfollowCount}
║  Всего пропущено:  ${skipCount}
║  Всего обработано: ${unfollowCount + skipCount}
╚═══════════════════════════════════════════════════════════════╝
    `);
}

let unfollowTimeout;
console.clear();
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         TWITTER UNFOLLOW AUTOMATION v2.2                      ║
╠═══════════════════════════════════════════════════════════════╣
║  🚀 Запуск скрипта...
║  🎯 Цель: ${TARGET_UNFOLLOWS} отписок
║  ⏱️  Задержка: 3-5 секунд
║  🛡️  ЗАЩИТА ВЗАИМНЫХ ПОДПИСЧИКОВ: ВКЛ
║  ⏸️  Авто-пауза: Каждые ${PAUSE_AFTER} отписок
╚═══════════════════════════════════════════════════════════════╝

Для остановки: stopScript()
`);

setTimeout(() => {
    playBeep(1200, 200);
    unfollowWithFilter();
}, 2000);

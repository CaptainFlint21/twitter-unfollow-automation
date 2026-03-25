let unfollowCount = 0;
let skipCount = 0;
let unfollowTimeout = null;
let countdownInterval = null; // ← ДОБАВЛЕНО

const PAUSE_AFTER = 50;
const PAUSE_DURATION = 300000; // 5 минут
const TARGET_UNFOLLOWS = 200;
const PROTECT_MUTUAL_FOLLOWERS = true;
const PROTECT_VERIFIED_ACCOUNTS = true;
const MAX_SCROLL_ATTEMPTS = 100;

let scrollAttempts = 0;
let isPaused = false;
let lastPauseAt = 0;

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
    
    console.clear();
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         TWITTER UNFOLLOW AUTOMATION v2.3                      ║
╚═══════════════════════════════════════════════════════════════╝

📊 PROGRESS
   [${progress.bar}] ${progress.percentage}%
   ${progress.current} / ${progress.target} unfollows

📈 STATISTICS
   ✅ Unfollowed:       ${unfollowCount}
   ⏭️  Skipped:         ${skipCount}
   📝 Total processed:  ${unfollowCount + skipCount}
   ⚡ Success rate:     ${(unfollowCount + skipCount) > 0 ? ((unfollowCount / (unfollowCount + skipCount)) * 100).toFixed(1) : 0}%

⏸️  PAUSE STATUS
   ⏳ Пауза каждые ${PAUSE_AFTER} отписок

⏱️  TIME: ${new Date().toLocaleTimeString()}

🎯 STATUS: ${unfollowCount >= TARGET_UNFOLLOWS ? '✅ GOAL REACHED!' : '🔄 RUNNING...'}
    `);
}

function playBeep(frequency = 800, duration = 200) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = frequency;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), duration);
    } catch (e) {
        console.warn('Audio context not available');
    }
}

function removeProcessedButton(button) {
    if (!button) return;
    
    const userCell = button.closest('[data-testid="UserCell"]') || 
                     button.closest('div[data-testid$="-cell"]') ||
                     button.closest('article') ||
                     button.parentElement?.parentElement?.parentElement;
    
    if (userCell) {
        userCell.style.opacity = '0.5';
        userCell.style.pointerEvents = 'none';
        setTimeout(() => userCell.remove(), 500);
    }
}

function isVerifiedAccount(userContainer) {
    if (!userContainer) return false;
    
    const verificationSvgs = userContainer.querySelectorAll('svg');
    
    for (let svg of verificationSvgs) {
        const ariaLabel = svg.getAttribute('aria-label') || '';
        
        if (ariaLabel.includes('Verified') || 
            ariaLabel.includes('Official') ||
            ariaLabel.includes('верифицирован') ||
            ariaLabel.includes('официальный')) {
            return true;
        }
    }
    
    return false;
}

function executePause() {
    isPaused = true;
    displayStats();
    playBeep(600, 300);
    
    const resumeTime = new Date(Date.now() + PAUSE_DURATION);
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    ⏸️  AUTO PAUSE ⏸️                           ║
╠═══════════════════════════════════════════════════════════════╣
║  Duration:         ${PAUSE_DURATION / 60000} minutes
║  Resume at:        ${resumeTime.toLocaleTimeString()}
║  Progress:         ${unfollowCount}/${TARGET_UNFOLLOWS}
╚═══════════════════════════════════════════════════════════════╝
    `);
    
    let remainingSeconds = PAUSE_DURATION / 1000;
    countdownInterval = setInterval(() => { // ← ИЗМЕНЕНО
        remainingSeconds--;
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        console.log(`⏳ Resume in: ${minutes}m ${seconds}s...`);
        
        if (remainingSeconds <= 0) clearInterval(countdownInterval);
    }, 1000);
    
    unfollowTimeout = setTimeout(() => {
        clearInterval(countdownInterval);
        playBeep(1000, 300);
        scrollAttempts = 0;
        isPaused = false;
        unfollowWithFilter();
    }, PAUSE_DURATION);
}

function unfollowWithFilter() {
    if (unfollowCount >= TARGET_UNFOLLOWS) {
        displayStats();
        playBeep(1000, 500);
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🎉 GOAL REACHED! 🎉                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Total unfollowed:  ${unfollowCount}
║  Total skipped:     ${skipCount}
║  Total processed:   ${unfollowCount + skipCount}
╚═══════════════════════════════════════════════════════════════╝
        `);
        return;
    }
    
    if (
        unfollowCount > 0 &&
        unfollowCount % PAUSE_AFTER === 0 &&
        unfollowCount !== lastPauseAt
    ) {
        lastPauseAt = unfollowCount;
        executePause();
        return;
    }

    const confirmButton = document.querySelector('[data-testid="confirmationSheetConfirm"]');
    
    if (confirmButton) {
        confirmButton.click();
        unfollowCount++;
        displayStats();
        
        unfollowTimeout = setTimeout(unfollowWithFilter, Math.floor(Math.random() * 2001) + 3000);
        return;
    }
    
    const unfollowButtons = document.querySelectorAll('[data-testid$="-unfollow"]');
    
    if (unfollowButtons.length === 0) {
        if (scrollAttempts < MAX_SCROLL_ATTEMPTS) {
            scrollAttempts++;
            window.scrollBy(0, 1000);
            unfollowTimeout = setTimeout(unfollowWithFilter, Math.floor(Math.random() * 2001) + 3000);
            return;
        } else {
            console.log('⚠️ Max scroll attempts reached. Script stopped.');
            stopScript();
            return;
        }
    }
    
    scrollAttempts = 0;
    const button = unfollowButtons[0];
    
    const userContainer = button.closest('[data-testid="UserCell"]') || 
                         button.closest('div[data-testid$="-cell"]') ||
                         button.closest('article') ||
                         button.parentElement?.parentElement?.parentElement;
    
    if (PROTECT_VERIFIED_ACCOUNTS && isVerifiedAccount(userContainer)) {
        skipCount++;
        removeProcessedButton(button);
        displayStats();
        unfollowTimeout = setTimeout(unfollowWithFilter, Math.floor(Math.random() * 2001) + 3000);
        return;
    }
    
    if (PROTECT_MUTUAL_FOLLOWERS) {
        if (userContainer) {
            const allText = userContainer.innerText || userContainer.textContent || '';
            const isFollowingBack = allText.includes('Follows you') || 
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
    if (unfollowTimeout) {
        clearTimeout(unfollowTimeout);
    }

    if (countdownInterval) { // ← ДОБАВЛЕНО
        clearInterval(countdownInterval);
    }

    isPaused = false;

    displayStats();
    playBeep(400, 500);
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🛑 SCRIPT STOPPED 🛑                       ║
╠═══════════════════════════════════════════════════════════════╣
║  Total unfollowed:  ${unfollowCount}
║  Total skipped:     ${skipCount}
║  Total processed:   ${unfollowCount + skipCount}
╚═══════════════════════════════════════════════════════════════╝
    `);
}

// ИНИЦИАЛИЗАЦИЯ
const mutualStatus = PROTECT_MUTUAL_FOLLOWERS ? 'ON' : 'OFF';
const verifiedStatus = PROTECT_VERIFIED_ACCOUNTS ? 'ON' : 'OFF';

console.clear();
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         TWITTER UNFOLLOW AUTOMATION v2.3                      ║
╠═══════════════════════════════════════════════════════════════╣
║  🚀 Script starting...
║  🎯 Goal: ${TARGET_UNFOLLOWS} unfollows
║  ⏱️  Delay: 3-5 seconds
║  🛡️  MUTUAL FOLLOWERS PROTECTION: ${mutualStatus}
║  ✅ VERIFIED ACCOUNTS PROTECTION: ${verifiedStatus}
║  ⏸️  Auto-pause: каждые ${PAUSE_AFTER} отписок на 5 минут
╚═══════════════════════════════════════════════════════════════╝

To stop: stopScript()
`);

setTimeout(() => {
    playBeep(1200, 200);
    unfollowWithFilter();
}, 2000);

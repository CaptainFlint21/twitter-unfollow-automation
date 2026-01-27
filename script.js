let unfollowCount = 0;
let skipCount = 0;
let unfollowTimeout = null;
const PAUSE_AFTER = 50;
const PAUSE_DURATION = 300000;
const TARGET_UNFOLLOWS = 200;
const PROTECT_MUTUAL_FOLLOWERS = true;
const MAX_SCROLL_ATTEMPTS = 100;
let scrollAttempts = 0;

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

📊 PROGRESS
   [${progress.bar}] ${progress.percentage}%
   ${progress.current} / ${progress.target} unfollows

📈 STATISTICS
   ✅ Unfollowed:       ${unfollowCount}
   ⏭️  Skipped:         ${skipCount}
   📝 Total processed:  ${unfollowCount + skipCount}
   ⚡ Success rate:     ${(unfollowCount + skipCount) > 0 ? ((unfollowCount / (unfollowCount + skipCount)) * 100).toFixed(1) : 0}%

⏸️  NEXT PAUSE
   In ${untilPause} unfollows (at ${nextPause})

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
    
    if (unfollowCount > 0 && unfollowCount % PAUSE_AFTER === 0) {
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
        const countdownInterval = setInterval(() => {
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
            unfollowWithFilter();
        }, PAUSE_DURATION);
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
    
    if (PROTECT_MUTUAL_FOLLOWERS) {
        const userContainer = button.closest('[data-testid="UserCell"]') || 
                             button.closest('div[data-testid$="-cell"]') ||
                             button.closest('article') ||
                             button.parentElement?.parentElement?.parentElement;
        
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

console.clear();
console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         TWITTER UNFOLLOW AUTOMATION v2.2                      ║
╠═══════════════════════════════════════════════════════════════╣
║  🚀 Script starting...
║  🎯 Goal: ${TARGET_UNFOLLOWS} unfollows
║  ⏱️  Delay: 3-5 seconds
║  🛡️  MUTUAL FOLLOWERS PROTECTION: ON
║  ⏸️  Auto-pause: Every ${PAUSE_AFTER} unfollows
╚═══════════════════════════════════════════════════════════════╝

To stop: stopScript()
`);

setTimeout(() => {
    playBeep(1200, 200);
    unfollowWithFilter();
}, 2000);

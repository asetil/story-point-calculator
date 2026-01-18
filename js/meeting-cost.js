document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const attendeesInput = document.getElementById('attendeesInput');
    const rateInput = document.getElementById('rateInput');
    const durationInput = document.getElementById('durationInput');
    const costDisplay = document.getElementById('costDisplay');

    // Opportunity Elements
    const bugFixCount = document.getElementById('bugFixCount');
    const featureCount = document.getElementById('featureCount');
    const learnCount = document.getElementById('learnCount');
    const prCount = document.getElementById('prCount');
    const videoCount = document.getElementById('videoCount');

    // Constants for Estimation (Man-Hours)
    const HOURS_PER_BUG = 2;       // Avg time to fix a standard bug
    const HOURS_PER_FEATURE = 8;   // Avg time (1 day) for a small feature
    const HOURS_PER_ARTICLE = 0.5; // Avg time (30 mins) to read a tech article
    const HOURS_PER_PR = 0.33;     // Avg time (20 mins) for a code review
    const HOURS_PER_VIDEO = 0.33;  // Avg time (20 mins) for a training video

    // Calculate Total Cost & Opportunity
    function calculateCost() {
        const attendees = parseInt(attendeesInput.value) || 0;
        const hourlyRate = parseFloat(rateInput.value) || 0;
        const durationHours = parseFloat(durationInput.value) || 0;

        // Financial Cost
        const totalCost = attendees * hourlyRate * durationHours;
        costDisplay.textContent = formatCurrency(totalCost);

        // Man-Hours Calculation
        // (If 5 people meet for 1 hour, that is 5 man-hours consumed)
        const totalManHours = attendees * durationHours;

        updateOpportunities(totalManHours);
    }

    function updateOpportunities(manHours) {
        // Calculate potential outputs
        const bugs = (manHours / HOURS_PER_BUG).toFixed(1);
        const features = (manHours / HOURS_PER_FEATURE).toFixed(1);
        const articles = (manHours / HOURS_PER_ARTICLE).toFixed(0);
        const prs = (manHours / HOURS_PER_PR).toFixed(1);
        const videos = (manHours / HOURS_PER_VIDEO).toFixed(0);

        // Update DOM
        if (bugFixCount) bugFixCount.textContent = bugs;
        if (featureCount) featureCount.textContent = features;
        if (learnCount) learnCount.textContent = articles;
        if (prCount) prCount.textContent = prs;
        if (videoCount) videoCount.textContent = videos;
    }

    function formatCurrency(val) {
        // Format with Turkish Lira symbol and commas
        return '₺' + val.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Event Listeners
    const inputs = [attendeesInput, rateInput, durationInput];
    inputs.forEach(input => {
        if (input) input.addEventListener('input', calculateCost);
    });

    // Initial Calculation
    calculateCost();
});

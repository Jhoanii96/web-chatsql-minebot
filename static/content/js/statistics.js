function calculateStatistics(data) {
    const n = data.length;
    
    // Calculate mean
    const mean = data.reduce((sum, value) => sum + value, 0) / n;
    
    // Calculate standard deviation
    const variance = data.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / (n - 1);
    const stddev = Math.sqrt(variance);
    
    // Calculate control limits
    const LCL = mean - 1 * stddev;
    const UCL = mean + 1 * stddev;
    
    // Number of data points beyond control limits
    const numberBeyondLimits = data.filter(value => value < LCL || value > UCL).length;
    
    // Number of violating runs
    let numberViolatingRuns = 0;
    let runLength = 0;
    let lastValue = null;
    
    for (const value of data) {
        if (value > mean) {
            if (lastValue !== 'above') {
                if (runLength >= 2) numberViolatingRuns++;
                runLength = 1;
                lastValue = 'above';
            } else {
                runLength++;
            }
        } else {
            if (lastValue !== 'below') {
                if (runLength >= 2) numberViolatingRuns++;
                runLength = 1;
                lastValue = 'below';
            } else {
                runLength++;
            }
        }
    }
    if (runLength >= 2) numberViolatingRuns++;
    
    return {
        mean,
        stddev,
        LCL,
        UCL,
        numberBeyondLimits,
        numberViolatingRuns
    };
}


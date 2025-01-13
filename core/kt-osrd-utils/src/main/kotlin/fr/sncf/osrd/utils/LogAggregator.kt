package fr.sncf.osrd.utils

/**
 * This class can be used to aggregate logs: when a specific error/warning happens thousands of time
 * in a row, we only report the first $n and only log the total error number afterward. The class
 * must be initialized once before the loop, errors should be logged with `logError`, and then
 * `logAggregatedSummary` should be called once at the end.
 */
data class LogAggregator(
    /** Function to use to log anything (e.g. `{ logger.warn(it) }` ). */
    val logFunction: (str: String) -> Unit,
    /** String to be used for collapsed errors, using %d and .format for the remaining number. */
    val summaryErrorMessage: String = "... and %d other similar errors",
    /** Max number of errors before collapsing the rest. */
    val maxReportedErrors: Int = 3,
) {
    private var nErrors = 0
    private var savedErrors = mutableListOf<String>()

    /** Registers an error. Does not log anything before the `reportSummary` call. */
    fun registerError(msg: String) {
        nErrors++
        if (savedErrors.size < maxReportedErrors) savedErrors.add(msg)
    }

    /** Logs the errors, collapsing the ones after `maxReportedErrors`. */
    fun logAggregatedSummary() {
        for (err in savedErrors) logFunction(err)
        val remainingErrors = nErrors - savedErrors.size
        if (remainingErrors > 0) logFunction(summaryErrorMessage.format(remainingErrors))
    }
}

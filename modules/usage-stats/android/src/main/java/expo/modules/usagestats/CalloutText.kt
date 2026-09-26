package expo.modules.usagestats

object CalloutText {
  // \b before the 1 keeps "11 minutes" plural: there is no word boundary between two digits.
  private val SINGULAR = Regex("""\b1 (minute|day)s\b""")

  fun fill(template: String, sessionMinutes: Long, todayMinutes: Long, daysLeft: Long): String =
    template
      .replace("{sessionMinutes}", sessionMinutes.toString())
      .replace("{todayMinutes}", todayMinutes.toString())
      .replace("{daysLeft}", daysLeft.toString())
      .replace(SINGULAR) { "1 ${it.groupValues[1]}" }
}

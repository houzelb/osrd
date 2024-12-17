package fr.sncf.osrd.utils

import java.math.BigInteger
import java.security.MessageDigest

// Stackoverflow:
// https://stackoverflow.com/questions/64171624/how-to-generate-an-md5-hash-in-kotlin
fun md5(input: String): String {
    val md = MessageDigest.getInstance("MD5")
    return BigInteger(1, md.digest(input.toByteArray())).toString(16).padStart(32, '0')
}

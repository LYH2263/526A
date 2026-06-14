package com.example.book.util;

import java.util.Arrays;
import java.util.List;

public class SensitiveWordFilter {

    private static final List<String> SENSITIVE_WORDS = Arrays.asList(
            "傻逼", "操你妈", "草泥马", "去死", "垃圾", "蠢", "白痴",
            "fuck", "shit", "asshole", "bitch", "damn"
    );

    private static final String REPLACEMENT = "***";

    public static String filter(String content) {
        if (content == null || content.isEmpty()) {
            return content;
        }
        String result = content;
        for (String word : SENSITIVE_WORDS) {
            result = result.replaceAll("(?i)" + word, REPLACEMENT);
        }
        return result;
    }

    public static boolean containsSensitiveWord(String content) {
        if (content == null || content.isEmpty()) {
            return false;
        }
        String lowerContent = content.toLowerCase();
        for (String word : SENSITIVE_WORDS) {
            if (lowerContent.contains(word.toLowerCase())) {
                return true;
            }
        }
        return false;
    }
}

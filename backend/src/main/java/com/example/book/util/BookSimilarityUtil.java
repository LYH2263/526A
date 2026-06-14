package com.example.book.util;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class BookSimilarityUtil {

    private static final Map<Character, String> PINYIN_MAP = new HashMap<>();

    static {
        PINYIN_MAP.put('啊', "a"); PINYIN_MAP.put('吧', "ba"); PINYIN_MAP.put('擦', "ca");
        PINYIN_MAP.put('搭', "da"); PINYIN_MAP.put('鹅', "e"); PINYIN_MAP.put('发', "fa");
        PINYIN_MAP.put('噶', "ga"); PINYIN_MAP.put('哈', "ha"); PINYIN_MAP.put('机', "ji");
        PINYIN_MAP.put('卡', "ka"); PINYIN_MAP.put('拉', "la"); PINYIN_MAP.put('妈', "ma");
        PINYIN_MAP.put('拿', "na"); PINYIN_MAP.put('哦', "o"); PINYIN_MAP.put('啪', "pa");
        PINYIN_MAP.put('七', "qi"); PINYIN_MAP.put('然', "ran"); PINYIN_MAP.put('撒', "sa");
        PINYIN_MAP.put('他', "ta"); PINYIN_MAP.put('挖', "wa"); PINYIN_MAP.put('西', "xi");
        PINYIN_MAP.put('呀', "ya"); PINYIN_MAP.put('杂', "za");
    }

    public static double editDistanceSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        if (s1.isEmpty() && s2.isEmpty()) return 1.0;
        if (s1.isEmpty() || s2.isEmpty()) return 0.0;

        int len1 = s1.length();
        int len2 = s2.length();
        int[][] dp = new int[len1 + 1][len2 + 1];

        for (int i = 0; i <= len1; i++) dp[i][0] = i;
        for (int j = 0; j <= len2; j++) dp[0][j] = j;

        for (int i = 1; i <= len1; i++) {
            for (int j = 1; j <= len2; j++) {
                if (s1.charAt(i - 1) == s2.charAt(j - 1)) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], Math.min(dp[i - 1][j], dp[i][j - 1]));
                }
            }
        }

        int maxLen = Math.max(len1, len2);
        return 1.0 - (double) dp[len1][len2] / maxLen;
    }

    public static double jaccardSimilarity(String s1, String s2) {
        if (s1 == null || s2 == null) return 0.0;
        if (s1.isEmpty() && s2.isEmpty()) return 1.0;
        if (s1.isEmpty() || s2.isEmpty()) return 0.0;

        Set<Character> set1 = new HashSet<>();
        Set<Character> set2 = new HashSet<>();
        for (char c : s1.toCharArray()) set1.add(c);
        for (char c : s2.toCharArray()) set2.add(c);

        Set<Character> intersection = new HashSet<>(set1);
        intersection.retainAll(set2);

        Set<Character> union = new HashSet<>(set1);
        union.addAll(set2);

        return union.isEmpty() ? 0.0 : (double) intersection.size() / union.size();
    }

    public static String normalize(String input) {
        if (input == null) return "";
        String normalized = input.toLowerCase();
        normalized = normalized.replaceAll("[\\s\\p{Punct}]", "");
        return normalized;
    }

    public static String normalizePinyin(String input) {
        if (input == null) return "";
        StringBuilder sb = new StringBuilder();
        for (char c : input.toCharArray()) {
            if (PINYIN_MAP.containsKey(c)) {
                sb.append(PINYIN_MAP.get(c));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    public static double computeBookSimilarity(String title1, String author1, String title2, String author2) {
        String normTitle1 = normalize(title1);
        String normTitle2 = normalize(title2);
        String normAuthor1 = normalize(author1);
        String normAuthor2 = normalize(author2);

        double titleEditSim = editDistanceSimilarity(normTitle1, normTitle2);
        double titleJaccardSim = jaccardSimilarity(normTitle1, normTitle2);
        double titleSim = 0.6 * titleEditSim + 0.4 * titleJaccardSim;

        double authorSim = 0.0;
        if (!normAuthor1.isEmpty() && !normAuthor2.isEmpty()) {
            double authorEditSim = editDistanceSimilarity(normAuthor1, normAuthor2);
            double authorJaccardSim = jaccardSimilarity(normAuthor1, normAuthor2);
            authorSim = 0.6 * authorEditSim + 0.4 * authorJaccardSim;
        } else {
            authorSim = 0.5;
        }

        return 0.65 * titleSim + 0.35 * authorSim;
    }
}

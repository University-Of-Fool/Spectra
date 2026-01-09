/**
 * Language:  Typst
 * Description: A markup-based typesetting system
 * Website: https://typst.app
 * Category: markup
 * Author: Claude Sonnet 4.5
 */

import type { HLJSApi, Language, Mode } from "highlight.js"

export default function typst(hljs: HLJSApi): Language {
    // Typst 函数调用 (以 # 开头)
    const FUNCTION_CALL: Mode = {
        scope: "built_in",
        begin: /#[a-zA-Z_][a-zA-Z0-9_-]*/,
        relevance: 10,
    }

    // 标题 (= 开头)
    const HEADING: Mode = {
        scope: "section",
        variants: [{ begin: /^={1,6}\s+. +$/, relevance: 10 }],
    }

    // 强调和粗体
    const EMPHASIS: Mode = {
        scope: "emphasis",
        begin: /\b_[^_\n]+_\b/,
        relevance: 0,
    }

    const STRONG: Mode = {
        scope: "strong",
        begin: /\*[^*\n]+\*/,
        relevance: 0,
    }

    // 行内代码
    const INLINE_CODE: Mode = {
        scope: "code",
        begin: /`[^`]+`/,
        relevance: 0,
    }

    // 数学模式
    const MATH: Mode = {
        scope: "formula",
        variants: [
            { begin: /\$\$/, end: /\$\$/ },
            { begin: /\$/, end: /\$/ },
        ],
        relevance: 10,
    }

    // 字符串
    const STRING: Mode = {
        scope: "string",
        variants: [
            {
                begin: /"/,
                end: /"/,
                contains: [hljs.BACKSLASH_ESCAPE],
            },
        ],
    }

    // 数字 (支持单位)
    const NUMBER: Mode = {
        scope: "number",
        variants: [
            { begin: /\b\d+\. ?\d*(pt|mm|cm|in|em|deg|rad|%)\b/ },
            { begin: /\b\d+\.?\d*\b/ },
        ],
        relevance: 0,
    }

    // 标签和引用
    const LABEL: Mode = {
        scope: "symbol",
        begin: /<[a-zA-Z_][a-zA-Z0-9_-]*>/,
        relevance: 5,
    }

    const REFERENCE: Mode = {
        scope: "link",
        begin: /@[a-zA-Z_][a-zA-Z0-9_-]*/,
        relevance: 5,
    }

    // 注释
    const COMMENT = hljs.COMMENT("//", "$")
    const BLOCK_COMMENT = hljs.COMMENT("/\\*", "\\*/")

    // 代码块
    const CODE_BLOCK: Mode = {
        scope: "code",
        begin: /```[a-z]*\n/,
        end: /```/,
        relevance: 10,
    }

    // 列表项
    const LIST_BULLET: Mode = {
        scope: "bullet",
        begin: /^[\s]*[-+*]/,
        relevance: 0,
    }

    // 术语列表
    const TERM_LIST: Mode = {
        scope: "attribute",
        begin: /^[\s]*\/[^: ]+:/,
        relevance: 0,
    }

    // 关键字定义
    const KEYWORDS = {
        keyword:
            "let set show if else for in while break continue return " +
            "import include as",
        literal: "true false none auto",
        built_in:
            // 文本和格式
            "text strong emph underline strike sub sup smallcaps " +
            // 布局
            "box block align pad stack grid table columns " +
            "h v linebreak pagebreak " +
            // 列表
            "list enum terms " +
            // 图形
            "image figure rect circle ellipse line polygon path " +
            // 数学
            "equation math frac vec mat " +
            // 文档
            "document page heading par " +
            // 其他
            "quote link cite bibliography footnote " +
            "raw code highlight",
    }

    return {
        name: "Typst",
        aliases: ["typ"],
        case_insensitive: false,
        keywords: KEYWORDS,
        contains: [
            COMMENT,
            BLOCK_COMMENT,
            HEADING,
            MATH,
            STRING,
            INLINE_CODE,
            STRONG,
            EMPHASIS,
            FUNCTION_CALL,
            LABEL,
            REFERENCE,
            NUMBER,
            CODE_BLOCK,
            LIST_BULLET,
            TERM_LIST,
        ],
    }
}

from backend.services.intent import IntentClassifier


questions = [
    "我上个月什么时候去徒步的？",
    "总结一下我最近的生活。",
    "给我一些今天写日记的灵感。",
    "我最近是不是压力很大？",
    "我之前计划整理什么？",
    "给我讲一个科幻故事。",
]
# questions = [
#     "总结一下我最近的生活。"
# ]

if __name__ == "__main__":
    classifier = IntentClassifier()

    for question in questions:
        result = classifier.classify(question)
        print(f"问题：{question}")
        print(f"意图：{result.intent.value}")
        print(f"需要日记：{result.needs_diary}")
        print("-" * 30)
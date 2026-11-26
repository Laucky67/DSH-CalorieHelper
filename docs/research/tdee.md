# 成人估算维持热量（TDEE）

建议采用美国国家科学院、工程院和医学院（NASEM）《Dietary Reference Intakes for Energy》（2023）表 5-16 的成人公式。按性别和日常活动等级选定一条公式，直接用年龄、身高和体重估算每日总能量消耗（TEE，也写作 TDEE）。模型用双标水法测得的总能量消耗数据拟合。对体重稳定的成人，每日总能量消耗等于维持体重的估计能量需要量（EER）。项目可将结果显示为「估算维持热量」。[NASEM 第 5 章](https://www.ncbi.nlm.nih.gov/sites/books/NBK591021/)

## 成人公式

`TDEE = 常数 + 年龄系数 × 年龄 + 身高系数 × 身高 + 体重系数 × 体重`

年龄用年，身高用厘米（cm），体重用千克（kg），结果为千卡/日（kcal/d）。项目可在计算日由出生日期求已满周岁，选定公式后代入当前身高和体重，保留计算精度，仅在展示时取整。公式已包含活动等级对总消耗的影响。两份官方表的八条公式系数一致。[NASEM 表 5-16](https://www.ncbi.nlm.nih.gov/books/NBK591021/?report=printable) · [Health Canada 成人公式](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/equations-estimate-energy-requirement.html)

| 性别 | 日常活动等级 | 常数 | 年龄系数 | 身高系数 | 体重系数 |
| --- | --- | ---: | ---: | ---: | ---: |
| 男 | 不活跃（Inactive） | 753.07 | -10.83 | 6.50 | 14.10 |
| 男 | 低活动（Low active） | 581.47 | -10.83 | 8.30 | 14.94 |
| 男 | 活跃（Active） | 1004.82 | -10.83 | 6.52 | 15.91 |
| 男 | 非常活跃（Very active） | -517.88 | -10.83 | 15.61 | 19.11 |
| 女 | 不活跃（Inactive） | 584.90 | -7.01 | 5.72 | 11.71 |
| 女 | 低活动（Low active） | 575.77 | -7.01 | 6.60 | 12.14 |
| 女 | 活跃（Active） | 710.25 | -7.01 | 6.54 | 12.34 |
| 女 | 非常活跃（Very active） | 511.83 | -7.01 | 9.07 | 12.56 |

## 日常活动等级

身体活动水平（PAL）是全天总能量消耗与基础代谢率（BMR）的比值。NASEM 用 19–70.99 岁样本的第 25、50、75 百分位确定成人组的三个切点，并把同一套分级应用于所有满 19 岁的成人，包括 71 岁及以上。[NASEM 第 5 章](https://www.ncbi.nlm.nih.gov/sites/books/NBK591021/) · [NASEM 表 5-3](https://www.ncbi.nlm.nih.gov/sites/books/NBK591021/table/tab_5_3/?report=objectonly)

| 日常活动等级 | 成人 PAL 范围 | 日常活动特征 |
| --- | --- | --- |
| 不活跃 | `1.00 ≤ PAL < 1.53` | 以维持独立生活所需的日常活动为主 |
| 低活动 | `1.53 ≤ PAL < 1.68` | 日常走动更多，有一些工作或休闲活动 |
| 活跃 | `1.68 ≤ PAL < 1.85` | 日常走动进一步增加，工作或休闲活动量更高 |
| 非常活跃 | `1.85 ≤ PAL < 2.50` | 日常活动之外，经常进行体力要求较高的工作或休闲活动 |

上表以 NASEM 正文表 5-4 为准，Health Canada 采用相同切点。NASEM 部分参考人群附表的脚注把低活动与活跃的分界写为 1.69，例如表 M-4。项目直接接收四个等级来选公式，计算无需数值切点。[NASEM 表 5-4](https://www.ncbi.nlm.nih.gov/sites/books/NBK591021/table/tab_5_4/?report=objectonly) · [NASEM 附录 M](https://www.ncbi.nlm.nih.gov/books/NBK591027/?report=reader) · [Health Canada 活动等级](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/equations-estimate-energy-requirement.html)

自选等级应参考整天的典型活动，包括通勤、工作、家务和休闲运动。NASEM 报告指出，步数和问卷与双标水法估得的个体 PAL 关系通常较弱。报告的典型日活动示例可帮助选择等级，单凭每周锻炼次数或达成运动指南的周运动时长难以可靠分档。[NASEM 第 7 章及表 7-1](https://www.ncbi.nlm.nih.gov/sites/books/NBK591020/)

## 算例

NASEM 官方算例为女性，22 岁，165 cm，63 kg，低活动。代入得 `575.77 - 7.01 × 22 + 6.60 × 165 + 12.14 × 63 = 2275.37 kcal/d`，显示 `2275 kcal/d`，与报告一致。[NASEM 第 7 章](https://www.ncbi.nlm.nih.gov/sites/books/NBK591020/)

独立算例为男性，35 岁，178 cm，75 kg。非常活跃时 `-517.88 - 10.83 × 35 + 15.61 × 178 + 19.11 × 75 = 3314.90 kcal/d`。同一组年龄、身高和体重在不活跃、低活动、活跃三档分别得 `2588.52`、`2800.32`、`2979.58 kcal/d`。[计算系数见 Health Canada 成人公式](https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/dietary-reference-intakes/tables/equations-estimate-energy-requirement.html)

## 与 Mifflin–St Jeor 和 FAO 的区别

Mifflin–St Jeor（1990）用间接测热数据建立静息能量消耗（REE）方程，研究样本为 498 名 19–78 岁健康成人。论文的简式为 `REE = 10 × 体重(kg) + 6.25 × 身高(cm) - 5 × 年龄(年) + 性别常数`，男加 `5`，女减 `161`。该论文预测的是静息消耗，未提供由日常活动等级计算全天总消耗的公式。[Mifflin 等原论文](https://pubmed.ncbi.nlm.nih.gov/2305711/)

FAO/WHO/UNU《Human energy requirements》给出 `TEE = BMR × PAL` 的计算框架，并将成人习惯活动量分为轻度或久坐（1.40–1.69）、中度（1.70–1.99）、高强度（2.00–2.40）。这个框架的乘数以 BMR 为基准。NASEM 2023 成人公式将四个活动等级用于选择回归系数，直接输出 TEE，无需再乘 PAL，也无需另外加回运动消耗。[FAO 第 2 章](https://www.fao.org/4/y5686e/y5686e04.htm) · [FAO 第 5 章表 5.3](https://www.fao.org/4/y5686e/y5686e07.htm) · [NASEM 第 5 章](https://www.ncbi.nlm.nih.gov/sites/books/NBK591021/)

## 适用范围

表 5-16 的成人组从满 19 岁开始，报告未设年龄上限。18 岁及以下、孕中晚期和哺乳期的 EER 有各自的公式或增量，孕早期则沿用相应的非孕期方程。报告的建模数据排除了会影响能量消耗的特定疾病、术后状态和极高活动量等情况。结果是同等特征人群的平均估计，个体值可有较大差异。例如报告给出的成人女性预测值标准误为 241 kcal/d。[NASEM 第 5 章](https://www.ncbi.nlm.nih.gov/sites/books/NBK591021/) · [NASEM 第 7 章](https://www.ncbi.nlm.nih.gov/sites/books/NBK591020/) · [NASEM 第 8 章](https://www.ncbi.nlm.nih.gov/sites/books/NBK591042/)

NASEM 的报告面向美国和加拿大一般人群。其中主要的双标水数据源包含多国研究，原始数据中 78.1% 的观测来自美国。用于中国居民时，应将此结果理解为北美参考模型的外推。在中国人群中，用双标水法测量 TEE 的研究已有发表，例如天津 18 名 50–60 岁、轻体力活动的健康成人研究。该研究比较的是《中国居民膳食营养素参考摄入量（2023 版）》的相应参考值，无法据此判定 NASEM 成人公式在中国各年龄和活动等级的误差。[NASEM 第 5 章数据来源](https://www.ncbi.nlm.nih.gov/sites/books/NBK591021/#ch5.s3) · [天津双标水研究原文](https://www.besjournal.com/en/article/doi/10.3967/bes2026.028)

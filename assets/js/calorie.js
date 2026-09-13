/* calorie.js —— 食物热量数据库 + 菜系成品菜热量 + 系统自动计算
 * 数据来源：参考《中国食物成分表(第6版)》《中国居民膳食指南2022》及常见菜谱份量估算
 * 说明：
 *  - FOODS：食材每 100g 可食部热量(kcal) + 默认份量
 *  - DISH_DB：各大菜系成品菜「每份(约1人份)」热量估算(kcal)，带 cuisine 标签
 *  - 计算优先级：先按食材明细精确计算；若未填食材或识别不到，则按「菜名匹配菜系菜谱」估算
 */
(function (global) {
  'use strict';

  // 每 100g 可食部热量(kcal) + 默认份量单位 + 该份量对应克数
  // 数据来源：科普中国 / 中国食物成分表(第6版) / 中国居民膳食指南2022
  var FOODS = {
    // 主食谷物薯类
    '米饭': { cal: 116, unit: '碗', gram: 150 }, '白米饭': { cal: 116, unit: '碗', gram: 150 },
    '糙米饭': { cal: 123, unit: '碗', gram: 150 }, '粥': { cal: 46, unit: '碗', gram: 250 },
    '馒头': { cal: 221, unit: '个', gram: 100 }, '面条': { cal: 110, unit: '碗', gram: 200 },
    '面包': { cal: 265, unit: '片', gram: 60 }, '饺子': { cal: 200, unit: '个', gram: 50 },
    '包子': { cal: 220, unit: '个', gram: 100 }, '红薯': { cal: 99, unit: '个', gram: 150 },
    '土豆': { cal: 76, unit: '个', gram: 150 }, '玉米': { cal: 112, unit: '根', gram: 150 },
    '燕麦': { cal: 367, unit: '碗', gram: 50 }, '南瓜': { cal: 26, unit: '份', gram: 100 },
    // 蛋白肉蛋水产
    '鸡蛋': { cal: 144, unit: '个', gram: 50 }, '鸡蛋白': { cal: 60, unit: '个', gram: 33 },
    '鸡胸肉': { cal: 133, unit: '块', gram: 120 }, '鸡肉': { cal: 167, unit: '份', gram: 100 },
    '牛肉': { cal: 106, unit: '份', gram: 100 }, '瘦牛肉': { cal: 106, unit: '份', gram: 100 },
    '猪肉': { cal: 395, unit: '份', gram: 100 }, '瘦肉': { cal: 143, unit: '份', gram: 100 },
    '羊肉': { cal: 118, unit: '份', gram: 100 }, '鱼肉': { cal: 113, unit: '份', gram: 100 },
    '三文鱼': { cal: 208, unit: '份', gram: 100 }, '虾': { cal: 83, unit: '份', gram: 100 },
    '虾仁': { cal: 99, unit: '份', gram: 100 }, '豆腐': { cal: 81, unit: '块', gram: 100 },
    '北豆腐': { cal: 81, unit: '块', gram: 100 }, '豆浆': { cal: 14, unit: '杯', gram: 240 },
    '牛奶': { cal: 65, unit: '杯', gram: 240 }, '酸奶': { cal: 72, unit: '杯', gram: 100 },
    // 蔬菜菌菇
    '番茄': { cal: 19, unit: '个', gram: 150 }, '西红柿': { cal: 19, unit: '个', gram: 150 },
    '黄瓜': { cal: 15, unit: '根', gram: 150 }, '白菜': { cal: 17, unit: '份', gram: 100 },
    '生菜': { cal: 15, unit: '份', gram: 100 }, '菠菜': { cal: 23, unit: '份', gram: 100 },
    '西兰花': { cal: 34, unit: '份', gram: 100 }, '茄子': { cal: 21, unit: '份', gram: 100 },
    '胡萝卜': { cal: 41, unit: '根', gram: 100 }, '青椒': { cal: 36, unit: '个', gram: 100 },
    '洋葱': { cal: 55, unit: '个', gram: 100 }, '蘑菇': { cal: 20, unit: '份', gram: 100 },
    '金针菇': { cal: 26, unit: '份', gram: 100 }, '冬瓜': { cal: 12, unit: '份', gram: 100 },
    '四季豆': { cal: 40, unit: '份', gram: 100 }, '藕': { cal: 74, unit: '份', gram: 100 },
    // 水果
    '苹果': { cal: 52, unit: '个', gram: 180 }, '香蕉': { cal: 91, unit: '根', gram: 120 },
    '橙子': { cal: 53, unit: '个', gram: 150 }, '橘子': { cal: 51, unit: '个', gram: 150 },
    '梨': { cal: 44, unit: '个', gram: 180 }, '西瓜': { cal: 25, unit: '份', gram: 200 },
    '葡萄': { cal: 43, unit: '份', gram: 100 }, '桃子': { cal: 48, unit: '个', gram: 150 },
    '猕猴桃': { cal: 56, unit: '个', gram: 120 }, '草莓': { cal: 32, unit: '份', gram: 100 },
    // 调味油脂
    '食用油': { cal: 884, unit: '勺', gram: 10 }, '油': { cal: 884, unit: '勺', gram: 10 },
    '糖': { cal: 400, unit: '勺', gram: 10 }, '沙拉酱': { cal: 300, unit: '勺', gram: 15 },
    '花生酱': { cal: 588, unit: '勺', gram: 15 }
  };

  // 菜系清单（用于归类与展示）
  var CUISINES = ["川菜","粤菜","鲁菜","苏菜","浙菜","闽菜","湘菜","徽菜","东北菜","西北菜","新疆菜","云南菜","贵州菜","京津菜","上海本帮","湖北菜","河南菜","山西菜","陕西菜","江西菜","台湾菜","素食","火锅","早点粥品","凉菜卤味","安徽菜","湖南小吃","广东小吃","福建小吃","山东小吃","日本料理","韩国料理","泰国菜","越南菜","东南亚","西餐","家常菜","主食小吃","小吃","炒粉面","汤羹","鸭货","烧烤","窑鸡","烘焙面包","西式快餐","饮品","甜品饮品","减脂轻食"];

  // 各大菜系成品菜 —— 每份(约1人份)热量估算(kcal)
  // cal: 每份热量；cuisine: 所属菜系
  var DISH_DB = {
    /* —— 川菜 —— */
    '宫保鸡丁': { cal: 260, cuisine: '川菜' }, '麻婆豆腐': { cal: 220, cuisine: '川菜' },
    '回锅肉': { cal: 330, cuisine: '川菜' }, '鱼香肉丝': { cal: 240, cuisine: '川菜' },
    '水煮肉片': { cal: 280, cuisine: '川菜' }, '辣子鸡': { cal: 320, cuisine: '川菜' },
    '夫妻肺片': { cal: 250, cuisine: '川菜' }, '担担面': { cal: 450, cuisine: '川菜' },
    '酸菜鱼': { cal: 250, cuisine: '川菜' }, '口水鸡': { cal: 240, cuisine: '川菜' },
    '毛血旺': { cal: 300, cuisine: '川菜' }, '川北凉粉': { cal: 180, cuisine: '川菜' },
    '樟茶鸭': { cal: 320, cuisine: '川菜' }, '钟水饺': { cal: 350, cuisine: '川菜' },
    '赖汤圆': { cal: 200, cuisine: '川菜' }, '钵钵鸡': { cal: 220, cuisine: '川菜' },
    '水煮鱼': { cal: 300, cuisine: '川菜' }, '灯影牛肉': { cal: 300, cuisine: '川菜' },
    '红油抄手': { cal: 380, cuisine: '川菜' }, '蚂蚁上树': { cal: 260, cuisine: '川菜' },
    '鱼香茄子': { cal: 180, cuisine: '川菜' }, '咸烧白': { cal: 340, cuisine: '川菜' },

    /* —— 粤菜 —— */
    '白切鸡': { cal: 200, cuisine: '粤菜' }, '烧鹅': { cal: 320, cuisine: '粤菜' },
    '叉烧': { cal: 280, cuisine: '粤菜' }, '蜜汁叉烧': { cal: 300, cuisine: '粤菜' },
    '清蒸鲈鱼': { cal: 160, cuisine: '粤菜' }, '老火靓汤': { cal: 120, cuisine: '粤菜' },
    '肠粉': { cal: 220, cuisine: '粤菜' }, '虾饺': { cal: 180, cuisine: '粤菜' },
    '干炒牛河': { cal: 500, cuisine: '粤菜' }, '艇仔粥': { cal: 150, cuisine: '粤菜' },
    '煲仔饭': { cal: 480, cuisine: '粤菜' }, '盐焗鸡': { cal: 250, cuisine: '粤菜' },
    '豉汁排骨': { cal: 260, cuisine: '粤菜' }, '流沙包': { cal: 250, cuisine: '粤菜' },
    '萝卜糕': { cal: 180, cuisine: '粤菜' }, '云吞面': { cal: 380, cuisine: '粤菜' },
    '菠萝包': { cal: 280, cuisine: '粤菜' }, '双皮奶': { cal: 200, cuisine: '粤菜' },
    '及第粥': { cal: 160, cuisine: '粤菜' }, '烧麦': { cal: 200, cuisine: '粤菜' },
    '豉汁凤爪': { cal: 180, cuisine: '粤菜' }, '白灼虾': { cal: 150, cuisine: '粤菜' },

    /* —— 鲁菜 —— */
    '糖醋鲤鱼': { cal: 280, cuisine: '鲁菜' }, '九转大肠': { cal: 350, cuisine: '鲁菜' },
    '葱烧海参': { cal: 220, cuisine: '鲁菜' }, '德州扒鸡': { cal: 250, cuisine: '鲁菜' },
    '把子肉': { cal: 400, cuisine: '鲁菜' }, '油旋': { cal: 250, cuisine: '鲁菜' },
    '煎饼': { cal: 300, cuisine: '鲁菜' }, '糖醋里脊': { cal: 320, cuisine: '鲁菜' },
    '爆炒腰花': { cal: 220, cuisine: '鲁菜' }, '木须肉': { cal: 230, cuisine: '鲁菜' },
    '锅塌豆腐': { cal: 240, cuisine: '鲁菜' }, '油焖大虾': { cal: 260, cuisine: '鲁菜' },
    '葱爆羊肉': { cal: 240, cuisine: '鲁菜' }, '糟溜鱼片': { cal: 200, cuisine: '鲁菜' },

    /* —— 苏菜 —— */
    '松鼠桂鱼': { cal: 320, cuisine: '苏菜' }, '狮子头': { cal: 350, cuisine: '苏菜' },
    '盐水鸭': { cal: 260, cuisine: '苏菜' }, '清炖蟹粉狮子头': { cal: 380, cuisine: '苏菜' },
    '响油鳝糊': { cal: 260, cuisine: '苏菜' }, '水晶肴肉': { cal: 300, cuisine: '苏菜' },
    '清蒸鲥鱼': { cal: 200, cuisine: '苏菜' }, '大煮干丝': { cal: 200, cuisine: '苏菜' },
    '蟹黄汤包': { cal: 250, cuisine: '苏菜' }, '桂花糖藕': { cal: 220, cuisine: '苏菜' },
    '酒酿圆子': { cal: 180, cuisine: '苏菜' }, '清炖蟹粉': { cal: 380, cuisine: '苏菜' },
    '盐水河虾': { cal: 160, cuisine: '苏菜' }, '樱桃肉': { cal: 360, cuisine: '苏菜' },

    /* —— 浙菜 —— */
    '西湖醋鱼': { cal: 240, cuisine: '浙菜' }, '东坡肉': { cal: 450, cuisine: '浙菜' },
    '龙井虾仁': { cal: 180, cuisine: '浙菜' }, '叫化鸡': { cal: 300, cuisine: '浙菜' },
    '宋嫂鱼羹': { cal: 150, cuisine: '浙菜' }, '定胜糕': { cal: 200, cuisine: '浙菜' },
    '片儿川': { cal: 350, cuisine: '浙菜' }, '宁波汤团': { cal: 200, cuisine: '浙菜' },
    '雪菜黄鱼': { cal: 220, cuisine: '浙菜' }, '蜜汁火方': { cal: 350, cuisine: '浙菜' },
    '干炸响铃': { cal: 280, cuisine: '浙菜' }, '知味观小笼': { cal: 300, cuisine: '浙菜' },
    '西湖莼菜汤': { cal: 60, cuisine: '浙菜' }, '油焖春笋': { cal: 140, cuisine: '浙菜' },

    /* —— 闽菜 —— */
    '佛跳墙': { cal: 350, cuisine: '闽菜' }, '荔枝肉': { cal: 280, cuisine: '闽菜' },
    '醉糟鸡': { cal: 220, cuisine: '闽菜' }, '海蛎煎': { cal: 250, cuisine: '闽菜' },
    '沙茶面': { cal: 450, cuisine: '闽菜' }, '鱼丸汤': { cal: 120, cuisine: '闽菜' },
    '肉燕': { cal: 200, cuisine: '闽菜' }, '红糟肉': { cal: 300, cuisine: '闽菜' },
    '芋泥': { cal: 250, cuisine: '闽菜' }, '太平燕': { cal: 200, cuisine: '闽菜' },
    '淡糟香螺': { cal: 220, cuisine: '闽菜' }, '南煎肝': { cal: 260, cuisine: '闽菜' },
    '闽生果': { cal: 240, cuisine: '闽菜' }, '蚌肉豆腐': { cal: 180, cuisine: '闽菜' },

    /* —— 湘菜 —— */
    '剁椒鱼头': { cal: 260, cuisine: '湘菜' }, '辣椒炒肉': { cal: 300, cuisine: '湘菜' },
    '东安子鸡': { cal: 240, cuisine: '湘菜' }, '组庵豆腐': { cal: 220, cuisine: '湘菜' },
    '永州血鸭': { cal: 280, cuisine: '湘菜' }, '毛氏红烧肉': { cal: 450, cuisine: '湘菜' },
    '口味虾': { cal: 320, cuisine: '湘菜' }, '糖油粑粑': { cal: 250, cuisine: '湘菜' },
    '发丝牛百叶': { cal: 220, cuisine: '湘菜' }, '腊味合蒸': { cal: 350, cuisine: '湘菜' },
    '湘西土匪猪肝': { cal: 260, cuisine: '湘菜' }, '东安鸡': { cal: 240, cuisine: '湘菜' },
    '酸豆角肉沫': { cal: 240, cuisine: '湘菜' }, '攸县香干': { cal: 200, cuisine: '湘菜' },

    /* —— 徽菜 —— */
    '臭鳜鱼': { cal: 260, cuisine: '徽菜' }, '火腿炖甲鱼': { cal: 300, cuisine: '徽菜' },
    '黄山炖鸽': { cal: 250, cuisine: '徽菜' }, '符离集烧鸡': { cal: 260, cuisine: '徽菜' },
    '李鸿章杂烩': { cal: 350, cuisine: '徽菜' }, '问政山笋': { cal: 120, cuisine: '徽菜' },
    '毛豆腐': { cal: 200, cuisine: '徽菜' }, '一品锅': { cal: 400, cuisine: '徽菜' },
    '中和汤': { cal: 150, cuisine: '徽菜' }, '徽州圆子': { cal: 220, cuisine: '徽菜' },
    '黄山炖鸡': { cal: 260, cuisine: '徽菜' }, '火腿炖鞭笋': { cal: 160, cuisine: '徽菜' },

    /* —— 家常菜 —— */
    '番茄炒蛋': { cal: 180, cuisine: '家常菜' }, '西红柿炒蛋': { cal: 180, cuisine: '家常菜' },
    '蛋炒饭': { cal: 290, cuisine: '家常菜' }, '炒饭': { cal: 290, cuisine: '家常菜' },
    '盖浇饭': { cal: 450, cuisine: '家常菜' }, '扬州炒饭': { cal: 300, cuisine: '家常菜' },
    '红烧肉': { cal: 450, cuisine: '家常菜' }, '可乐鸡翅': { cal: 260, cuisine: '家常菜' },
    '清蒸鱼': { cal: 160, cuisine: '家常菜' }, '红烧鱼': { cal: 220, cuisine: '家常菜' },
    '炒青菜': { cal: 90, cuisine: '家常菜' }, '地三鲜': { cal: 180, cuisine: '家常菜' },
    '牛肉面': { cal: 550, cuisine: '家常菜' }, '阳春面': { cal: 320, cuisine: '家常菜' },
    '西红柿鸡蛋面': { cal: 350, cuisine: '家常菜' }, '炸酱面': { cal: 500, cuisine: '家常菜' },
    '凉皮': { cal: 300, cuisine: '家常菜' }, '饺子': { cal: 500, cuisine: '家常菜' },
    '馄饨': { cal: 380, cuisine: '家常菜' }, '皮蛋瘦肉粥': { cal: 150, cuisine: '家常菜' },
    '小米粥': { cal: 100, cuisine: '家常菜' }, '小笼包': { cal: 350, cuisine: '家常菜' },
    '麻辣烫': { cal: 400, cuisine: '家常菜' }, '炸鸡': { cal: 300, cuisine: '家常菜' },
    '螺蛳粉': { cal: 898, cuisine: '家常菜' }, '黄焖鸡米饭': { cal: 430, cuisine: '家常菜' },
    '肉夹馍': { cal: 250, cuisine: '家常菜' }, '煎饼果子': { cal: 350, cuisine: '家常菜' },
    '烤冷面': { cal: 400, cuisine: '家常菜' }, '关东煮': { cal: 200, cuisine: '家常菜' },
    '烧烤': { cal: 350, cuisine: '家常菜' }, '火锅': { cal: 500, cuisine: '家常菜' },
    '咖喱饭': { cal: 420, cuisine: '家常菜' }, '红烧排骨': { cal: 380, cuisine: '家常菜' },
    '青椒肉丝': { cal: 240, cuisine: '家常菜' }, '土豆炖牛肉': { cal: 320, cuisine: '家常菜' },
    '清炒时蔬': { cal: 80, cuisine: '家常菜' }, '紫菜蛋花汤': { cal: 60, cuisine: '家常菜' },
    '西红柿蛋汤': { cal: 70, cuisine: '家常菜' }, '清炒西兰花': { cal: 90, cuisine: '家常菜' },
    '红烧茄子': { cal: 160, cuisine: '家常菜' }, '酸辣土豆丝': { cal: 140, cuisine: '家常菜' },

    /* —— 主食小吃 —— */
    '米饭': { cal: 200, cuisine: '主食小吃' }, '白米饭': { cal: 200, cuisine: '主食小吃' },
    '馒头': { cal: 220, cuisine: '主食小吃' }, '包子': { cal: 220, cuisine: '主食小吃' },
    '面条': { cal: 220, cuisine: '主食小吃' }, '饺子(10个)': { cal: 500, cuisine: '主食小吃' },
    '馄饨': { cal: 380, cuisine: '主食小吃' }, '披萨(1块)': { cal: 250, cuisine: '主食小吃' },
    '汉堡': { cal: 500, cuisine: '主食小吃' }, '寿司': { cal: 350, cuisine: '主食小吃' },
    '三明治': { cal: 300, cuisine: '主食小吃' }, '披萨': { cal: 250, cuisine: '主食小吃' },
    '油条': { cal: 270, cuisine: '主食小吃' }, '豆浆': { cal: 35, cuisine: '主食小吃' },
    '八宝粥': { cal: 150, cuisine: '主食小吃' }, '葱油饼': { cal: 300, cuisine: '主食小吃' },
    '烧麦': { cal: 200, cuisine: '主食小吃' }, '饭团': { cal: 250, cuisine: '主食小吃' },
    '糯米饭': { cal: 240, cuisine: '主食小吃' }, '手抓饼': { cal: 320, cuisine: '主食小吃' },

    /* —— 西式快餐 —— */
    '薯条': { cal: 300, cuisine: '西式快餐' }, '鸡块': { cal: 280, cuisine: '西式快餐' },
    '炸鸡(1块)': { cal: 300, cuisine: '西式快餐' }, '蔬菜沙拉': { cal: 120, cuisine: '西式快餐' },
    '鸡肉沙拉': { cal: 220, cuisine: '西式快餐' }, '意面': { cal: 400, cuisine: '西式快餐' },
    '披萨': { cal: 250, cuisine: '西式快餐' }, '汉堡': { cal: 500, cuisine: '西式快餐' },
    '热狗': { cal: 290, cuisine: '西式快餐' }, '可乐饼': { cal: 260, cuisine: '西式快餐' },

    /* —— 甜品饮品 —— */
    '奶茶': { cal: 300, cuisine: '甜品饮品' }, '奶茶(中杯)': { cal: 300, cuisine: '甜品饮品' },
    '可乐': { cal: 140, cuisine: '甜品饮品' }, '可乐(1罐)': { cal: 140, cuisine: '甜品饮品' },
    '咖啡': { cal: 5, cuisine: '甜品饮品' }, '蛋糕(1块)': { cal: 350, cuisine: '甜品饮品' },
    '冰淇淋': { cal: 200, cuisine: '甜品饮品' }, '红豆沙': { cal: 180, cuisine: '甜品饮品' },
    '绿豆沙': { cal: 160, cuisine: '甜品饮品' }, '杨枝甘露': { cal: 250, cuisine: '甜品饮品' },
    '鲜芋仙': { cal: 220, cuisine: '甜品饮品' }, '布丁': { cal: 200, cuisine: '甜品饮品' },
    '马卡龙': { cal: 80, cuisine: '甜品饮品' }, '芝士蛋糕': { cal: 380, cuisine: '甜品饮品' },
    '珍珠奶茶': { cal: 350, cuisine: '甜品饮品' }, '柠檬茶': { cal: 120, cuisine: '甜品饮品' },

    /* —— 东北菜 —— */
    '锅包肉': { cal: 480, cuisine: '东北菜' }, '猪肉炖粉条': { cal: 350, cuisine: '东北菜' },
    '溜肉段': { cal: 450, cuisine: '东北菜' }, '小鸡炖蘑菇': { cal: 300, cuisine: '东北菜' },
    '酸菜白肉': { cal: 320, cuisine: '东北菜' }, '东北大拉皮': { cal: 280, cuisine: '东北菜' },
    '酱骨头': { cal: 400, cuisine: '东北菜' }, '拔丝地瓜': { cal: 360, cuisine: '东北菜' },
    '东北乱炖': { cal: 280, cuisine: '东北菜' }, '吉林冷面': { cal: 350, cuisine: '东北菜' },
    '哈尔滨红肠': { cal: 250, cuisine: '东北菜' }, '铁锅炖': { cal: 420, cuisine: '东北菜' },
    '雪衣豆沙': { cal: 320, cuisine: '东北菜' }, '熏肉大饼': { cal: 380, cuisine: '东北菜' },
    '得莫利炖鱼': { cal: 300, cuisine: '东北菜' }, '粘豆包': { cal: 220, cuisine: '东北菜' },
    '杀猪菜': { cal: 300, cuisine: '东北菜' }, '尖椒干豆腐': { cal: 160, cuisine: '东北菜' },
    '东北血肠': { cal: 220, cuisine: '东北菜' }, '东北焖子': { cal: 240, cuisine: '东北菜' },

    /* —— 西北菜 —— */
    '兰州拉面': { cal: 400, cuisine: '西北菜' }, '牛肉拉面': { cal: 420, cuisine: '西北菜' },
    '羊肉泡馍': { cal: 450, cuisine: '西北菜' }, '油泼面': { cal: 400, cuisine: '西北菜' },
    '臊子面': { cal: 380, cuisine: '西北菜' }, 'biangbiang面': { cal: 450, cuisine: '西北菜' },
    '大盘鸡': { cal: 480, cuisine: '西北菜' }, '手抓羊肉': { cal: 350, cuisine: '西北菜' },
    '烤馕': { cal: 250, cuisine: '西北菜' }, '馕包肉': { cal: 400, cuisine: '西北菜' },
    '炒拉条子': { cal: 400, cuisine: '西北菜' }, '揪面片': { cal: 380, cuisine: '西北菜' },
    '酿皮': { cal: 300, cuisine: '西北菜' }, '浆水面': { cal: 320, cuisine: '西北菜' },
    '炒炮': { cal: 380, cuisine: '西北菜' }, '炮仗面': { cal: 380, cuisine: '西北菜' },
    '丁丁炒面': { cal: 400, cuisine: '西北菜' }, '新疆拌面': { cal: 420, cuisine: '西北菜' },

    /* —— 新疆菜 —— */
    '手抓饭': { cal: 420, cuisine: '新疆菜' }, '薄皮包子': { cal: 200, cuisine: '新疆菜' },
    '烤包子': { cal: 220, cuisine: '新疆菜' }, '椒麻鸡': { cal: 280, cuisine: '新疆菜' },
    '缸子肉': { cal: 300, cuisine: '新疆菜' }, '烤全羊': { cal: 600, cuisine: '新疆菜' },
    '馕坑肉': { cal: 380, cuisine: '新疆菜' }, '拌面': { cal: 400, cuisine: '新疆菜' },
    '抓饭': { cal: 420, cuisine: '新疆菜' }, '烤羊腿': { cal: 450, cuisine: '新疆菜' },
    '新疆炒米粉': { cal: 420, cuisine: '新疆菜' }, '酸奶子': { cal: 100, cuisine: '新疆菜' },
    '烤南瓜': { cal: 120, cuisine: '新疆菜' }, '新疆大盘鸡': { cal: 480, cuisine: '新疆菜' },

    /* —— 云南菜 —— */
    '汽锅鸡': { cal: 240, cuisine: '云南菜' }, '野生菌火锅': { cal: 300, cuisine: '云南菜' },
    '鲜花饼': { cal: 180, cuisine: '云南菜' }, '饵块': { cal: 250, cuisine: '云南菜' },
    '宣威火腿': { cal: 280, cuisine: '云南菜' }, '老奶洋芋': { cal: 200, cuisine: '云南菜' },
    '傣味烤鱼': { cal: 320, cuisine: '云南菜' }, '烤乳扇': { cal: 200, cuisine: '云南菜' },
    '云南酸辣鱼': { cal: 260, cuisine: '云南菜' }, '小锅米线': { cal: 360, cuisine: '云南菜' },
    '竹筒饭': { cal: 280, cuisine: '云南菜' }, '凉拌折耳根': { cal: 80, cuisine: '云南菜' },
    '过桥米线云南': { cal: 400, cuisine: '云南菜' }, '炸洋芋': { cal: 220, cuisine: '云南菜' },

    /* —— 贵州菜 —— */
    '贵州酸汤鱼': { cal: 280, cuisine: '贵州菜' }, '折耳根': { cal: 60, cuisine: '贵州菜' },
    '肠旺面': { cal: 400, cuisine: '贵州菜' }, '丝娃娃': { cal: 200, cuisine: '贵州菜' },
    '贵州辣子鸡': { cal: 420, cuisine: '贵州菜' }, '花溪牛肉粉': { cal: 360, cuisine: '贵州菜' },
    '豆腐圆子': { cal: 220, cuisine: '贵州菜' }, '糟辣椒炒肉': { cal: 300, cuisine: '贵州菜' },
    '糯米饭团': { cal: 280, cuisine: '贵州菜' }, '酸汤肉丸': { cal: 260, cuisine: '贵州菜' },
    '贵州米豆腐': { cal: 160, cuisine: '贵州菜' }, '恋爱豆腐果': { cal: 200, cuisine: '贵州菜' },

    /* —— 小吃 / 街头 —— */
    '章鱼小丸子': { cal: 200, cuisine: '小吃' }, '糖葫芦': { cal: 150, cuisine: '小吃' },
    '臭豆腐': { cal: 220, cuisine: '小吃' }, '鸡蛋灌饼': { cal: 300, cuisine: '小吃' },
    '钵仔糕': { cal: 120, cuisine: '小吃' }, '麻糍': { cal: 200, cuisine: '小吃' },
    '驴打滚': { cal: 220, cuisine: '小吃' }, '凉粉': { cal: 100, cuisine: '小吃' },
    '龟苓膏': { cal: 90, cuisine: '小吃' }, '鸡蛋仔': { cal: 250, cuisine: '小吃' },
    '炸串': { cal: 300, cuisine: '小吃' }, '糍粑': { cal: 220, cuisine: '小吃' },
    '豆皮': { cal: 150, cuisine: '小吃' }, '烤红薯': { cal: 180, cuisine: '小吃' },
    '炸鲜奶': { cal: 260, cuisine: '小吃' }, '糖糕': { cal: 240, cuisine: '小吃' },
    '炸糕': { cal: 250, cuisine: '小吃' }, '豆汁': { cal: 30, cuisine: '小吃' },
    '焦圈': { cal: 200, cuisine: '小吃' }, '艾窝窝': { cal: 160, cuisine: '小吃' },
    '豌豆黄': { cal: 140, cuisine: '小吃' }, '炒酸奶': { cal: 180, cuisine: '小吃' },
    '烤面筋串': { cal: 200, cuisine: '小吃' }, '炸薯塔': { cal: 280, cuisine: '小吃' },

    /* —— 炒粉面 / 粉面 —— */
    '炒米粉': { cal: 400, cuisine: '炒粉面' }, '炒河粉': { cal: 450, cuisine: '炒粉面' },
    '炒面': { cal: 380, cuisine: '炒粉面' }, '炒乌冬': { cal: 420, cuisine: '炒粉面' },
    '炒年糕': { cal: 350, cuisine: '炒粉面' }, '炒粉': { cal: 380, cuisine: '炒粉面' },
    '桂林米粉': { cal: 350, cuisine: '炒粉面' }, '拌粉': { cal: 320, cuisine: '炒粉面' },
    '南昌拌粉': { cal: 340, cuisine: '炒粉面' }, '过桥米线': { cal: 400, cuisine: '炒粉面' },
    '酸辣粉': { cal: 350, cuisine: '炒粉面' }, '热干面': { cal: 380, cuisine: '炒粉面' },
    '重庆小面': { cal: 360, cuisine: '炒粉面' }, '板面': { cal: 380, cuisine: '炒粉面' },
    '土豆粉': { cal: 360, cuisine: '炒粉面' }, '红薯粉': { cal: 340, cuisine: '炒粉面' },
    '米线': { cal: 350, cuisine: '炒粉面' }, '汤粉': { cal: 340, cuisine: '炒粉面' },
    '炒饼': { cal: 360, cuisine: '炒粉面' }, '炒疙瘩': { cal: 350, cuisine: '炒粉面' },
    '车仔面': { cal: 380, cuisine: '炒粉面' }, '炒拨烂子': { cal: 340, cuisine: '炒粉面' },

    /* —— 汤羹 —— */
    '鸡汤': { cal: 180, cuisine: '汤羹' }, '排骨汤': { cal: 250, cuisine: '汤羹' },
    '鱼头豆腐汤': { cal: 220, cuisine: '汤羹' }, '冬瓜排骨汤': { cal: 200, cuisine: '汤羹' },
    '莲藕排骨汤': { cal: 230, cuisine: '汤羹' }, '银耳汤': { cal: 120, cuisine: '汤羹' },
    '西湖牛肉羹': { cal: 150, cuisine: '汤羹' }, '胡辣汤': { cal: 130, cuisine: '汤羹' },
    '酸辣汤': { cal: 120, cuisine: '汤羹' }, '罗宋汤': { cal: 180, cuisine: '汤羹' },
    '海鲜羹': { cal: 160, cuisine: '汤羹' }, '粟米羹': { cal: 130, cuisine: '汤羹' },
    '羊肉汤': { cal: 220, cuisine: '汤羹' }, '牛肉汤': { cal: 200, cuisine: '汤羹' },
    '鸽子汤': { cal: 190, cuisine: '汤羹' }, '老鸭汤': { cal: 210, cuisine: '汤羹' },
    '蘑菇汤': { cal: 100, cuisine: '汤羹' }, '番茄汤': { cal: 90, cuisine: '汤羹' },
    '豆腐汤': { cal: 110, cuisine: '汤羹' }, '玉米排骨汤': { cal: 220, cuisine: '汤羹' },
    '海带汤': { cal: 80, cuisine: '汤羹' }, '竹荪汤': { cal: 120, cuisine: '汤羹' },
    '瓦罐汤': { cal: 200, cuisine: '汤羹' }, '猪肚汤': { cal: 210, cuisine: '汤羹' },
    '酸菜汤': { cal: 100, cuisine: '汤羹' },

    /* —— 鸭货 —— */
    '鸭脖': { cal: 180, cuisine: '鸭货' }, '鸭翅': { cal: 150, cuisine: '鸭货' },
    '鸭锁骨': { cal: 200, cuisine: '鸭货' }, '鸭掌': { cal: 160, cuisine: '鸭货' },
    '鸭头': { cal: 140, cuisine: '鸭货' }, '鸭舌': { cal: 220, cuisine: '鸭货' },
    '鸭肠': { cal: 130, cuisine: '鸭货' }, '鸭胗': { cal: 170, cuisine: '鸭货' },
    '鸭架': { cal: 250, cuisine: '鸭货' }, '酱鸭': { cal: 300, cuisine: '鸭货' },
    '烤鸭': { cal: 450, cuisine: '鸭货' }, '卤鸭': { cal: 280, cuisine: '鸭货' },
    '啤酒鸭': { cal: 320, cuisine: '鸭货' }, '板鸭': { cal: 330, cuisine: '鸭货' },

    /* —— 烧烤 —— */
    '烤羊肉串': { cal: 280, cuisine: '烧烤' }, '烤鸡翅': { cal: 200, cuisine: '烧烤' },
    '烤五花肉': { cal: 320, cuisine: '烧烤' }, '烤茄子': { cal: 150, cuisine: '烧烤' },
    '烤生蚝': { cal: 120, cuisine: '烧烤' }, '烤韭菜': { cal: 80, cuisine: '烧烤' },
    '烤金针菇': { cal: 100, cuisine: '烧烤' }, '烤玉米': { cal: 180, cuisine: '烧烤' },
    '烤鱼': { cal: 350, cuisine: '烧烤' }, '烤面筋': { cal: 200, cuisine: '烧烤' },
    '烤香肠': { cal: 250, cuisine: '烧烤' }, '烤土豆片': { cal: 120, cuisine: '烧烤' },
    '烤鸡心': { cal: 180, cuisine: '烧烤' }, '烤板筋': { cal: 200, cuisine: '烧烤' },
    '烤大虾': { cal: 220, cuisine: '烧烤' }, '烤鱿鱼': { cal: 200, cuisine: '烧烤' },
    '烤馒头': { cal: 160, cuisine: '烧烤' }, '烤鸡胗': { cal: 190, cuisine: '烧烤' },
    '烤腰子': { cal: 210, cuisine: '烧烤' }, '烤大蒜': { cal: 60, cuisine: '烧烤' },
    '烤平菇': { cal: 90, cuisine: '烧烤' }, '烤年糕': { cal: 200, cuisine: '烧烤' },
    '烤豆腐': { cal: 130, cuisine: '烧烤' }, '烤脑花': { cal: 230, cuisine: '烧烤' },
    '烤青椒': { cal: 70, cuisine: '烧烤' }, '烤香菇': { cal: 90, cuisine: '烧烤' },

    /* —— 窑鸡 / 客家菜 —— */
    '窑鸡': { cal: 380, cuisine: '窑鸡' }, '客家酿豆腐': { cal: 220, cuisine: '窑鸡' },
    '梅菜扣肉': { cal: 420, cuisine: '窑鸡' }, '盆菜': { cal: 450, cuisine: '窑鸡' },
    '客家猪肉汤': { cal: 260, cuisine: '窑鸡' }, '酿苦瓜': { cal: 180, cuisine: '窑鸡' },
    '猪肚鸡': { cal: 320, cuisine: '窑鸡' }, '客家咸鸡': { cal: 280, cuisine: '窑鸡' },
    '客家黄酒鸡': { cal: 300, cuisine: '窑鸡' }, '客家焖猪肉': { cal: 360, cuisine: '窑鸡' },
    '客家擂茶': { cal: 150, cuisine: '窑鸡' }, '客家萝卜干炒肉': { cal: 240, cuisine: '窑鸡' },

    /* —— 烘焙面包 —— */
    '吐司': { cal: 260, cuisine: '烘焙面包' }, '牛角包': { cal: 280, cuisine: '烘焙面包' },
    '可颂': { cal: 280, cuisine: '烘焙面包' }, '法棍': { cal: 200, cuisine: '烘焙面包' },
    '全麦面包': { cal: 240, cuisine: '烘焙面包' }, '欧包': { cal: 250, cuisine: '烘焙面包' },
    '贝果': { cal: 250, cuisine: '烘焙面包' }, '甜甜圈': { cal: 300, cuisine: '烘焙面包' },
    '泡芙': { cal: 200, cuisine: '烘焙面包' }, '曲奇': { cal: 180, cuisine: '烘焙面包' },
    '司康': { cal: 220, cuisine: '烘焙面包' }, '麻薯': { cal: 150, cuisine: '烘焙面包' },
    '蛋挞': { cal: 200, cuisine: '烘焙面包' }, '老婆饼': { cal: 180, cuisine: '烘焙面包' },
    '蛋黄酥': { cal: 220, cuisine: '烘焙面包' }, '肉松面包': { cal: 280, cuisine: '烘焙面包' },
    '芝士面包': { cal: 270, cuisine: '烘焙面包' }, '红豆面包': { cal: 260, cuisine: '烘焙面包' },
    '椰蓉面包': { cal: 260, cuisine: '烘焙面包' }, '虎皮蛋糕': { cal: 320, cuisine: '烘焙面包' },
    '无水蛋糕': { cal: 300, cuisine: '烘焙面包' }, '蜂蜜蛋糕': { cal: 300, cuisine: '烘焙面包' },
    '黑森林蛋糕': { cal: 380, cuisine: '烘焙面包' }, '慕斯蛋糕': { cal: 280, cuisine: '烘焙面包' },

    /* —— 饮品 —— */
    '啤酒': { cal: 150, cuisine: '饮品' }, '橙汁': { cal: 120, cuisine: '饮品' },
    '雪碧': { cal: 140, cuisine: '饮品' }, '美式咖啡': { cal: 10, cuisine: '饮品' },
    '拿铁': { cal: 150, cuisine: '饮品' }, '矿泉水': { cal: 0, cuisine: '饮品' },
    '王老吉': { cal: 100, cuisine: '饮品' }, '加多宝': { cal: 100, cuisine: '饮品' },
    '酸梅汤': { cal: 120, cuisine: '饮品' }, '冰红茶': { cal: 130, cuisine: '饮品' },
    '绿茶': { cal: 0, cuisine: '饮品' }, '乌龙茶': { cal: 0, cuisine: '饮品' },
    '气泡水': { cal: 0, cuisine: '饮品' }, '红牛': { cal: 110, cuisine: '饮品' },
    '椰子水': { cal: 50, cuisine: '饮品' }, '芒果汁': { cal: 130, cuisine: '饮品' },
    '葡萄汁': { cal: 130, cuisine: '饮品' }, '豆奶': { cal: 120, cuisine: '饮品' },
    '椰汁': { cal: 180, cuisine: '饮品' }, '冰糖雪梨': { cal: 110, cuisine: '饮品' },
    '杏仁露': { cal: 120, cuisine: '饮品' }, '旺仔牛奶': { cal: 150, cuisine: '饮品' },
    '阿萨姆奶茶': { cal: 200, cuisine: '饮品' }, '茉莉花茶': { cal: 0, cuisine: '饮品' },
    '菊花茶': { cal: 0, cuisine: '饮品' }, '养乐多': { cal: 70, cuisine: '饮品' },
    '果粒橙': { cal: 130, cuisine: '饮品' }, '脉动': { cal: 100, cuisine: '饮品' },
    '北冰洋': { cal: 110, cuisine: '饮品' }, '蜂蜜水': { cal: 60, cuisine: '饮品' },

    /* —— 减脂轻食 —— */
    '鸡胸肉沙拉': { cal: 180, cuisine: '减脂轻食' }, '牛油果沙拉': { cal: 220, cuisine: '减脂轻食' },
    '水煮蛋': { cal: 70, cuisine: '减脂轻食' }, '水煮西兰花': { cal: 60, cuisine: '减脂轻食' },
    '轻食碗': { cal: 250, cuisine: '减脂轻食' }, '藜麦饭': { cal: 180, cuisine: '减脂轻食' },
    '紫薯': { cal: 120, cuisine: '减脂轻食' }, '希腊酸奶': { cal: 90, cuisine: '减脂轻食' },
    '能量棒': { cal: 160, cuisine: '减脂轻食' }, '鸡胸肉丸': { cal: 150, cuisine: '减脂轻食' },
    '凉拌秋葵': { cal: 70, cuisine: '减脂轻食' }, '蒸蛋羹': { cal: 90, cuisine: '减脂轻食' },

    /* —— 外国菜品（日本/韩国/泰国/越南/东南亚/西餐等） —— */
    '刺身': { cal: 150, cuisine: '日本料理' },
    '日式拉面': { cal: 420, cuisine: '日本料理' },
    '豚骨拉面': { cal: 450, cuisine: '日本料理' },
    '酱油拉面': { cal: 400, cuisine: '日本料理' },
    '味噌拉面': { cal: 410, cuisine: '日本料理' },
    '天妇罗': { cal: 250, cuisine: '日本料理' },
    '鳗鱼饭': { cal: 480, cuisine: '日本料理' },
    '亲子丼': { cal: 380, cuisine: '日本料理' },
    '日式咖喱饭': { cal: 430, cuisine: '日本料理' },
    '乌冬面': { cal: 350, cuisine: '日本料理' },
    '日式饭团': { cal: 150, cuisine: '日本料理' },
    '寿喜锅': { cal: 350, cuisine: '日本料理' },
    '涮涮锅': { cal: 300, cuisine: '日本料理' },
    '日式炸鸡': { cal: 300, cuisine: '日本料理' },
    '茶碗蒸': { cal: 90, cuisine: '日本料理' },
    '味噌汤': { cal: 60, cuisine: '日本料理' },
    '冷豆腐': { cal: 80, cuisine: '日本料理' },
    '毛豆': { cal: 120, cuisine: '日本料理' },
    '日式煎饺': { cal: 300, cuisine: '日本料理' },
    '玉子烧': { cal: 160, cuisine: '日本料理' },
    '日式烧鸟': { cal: 220, cuisine: '日本料理' },
    '照烧鸡': { cal: 280, cuisine: '日本料理' },
    '猪排饭': { cal: 450, cuisine: '日本料理' },
    '牛肉饭': { cal: 400, cuisine: '日本料理' },
    '海鲜丼': { cal: 380, cuisine: '日本料理' },
    '荞麦面': { cal: 340, cuisine: '日本料理' },
    '大阪烧': { cal: 300, cuisine: '日本料理' },
    '铜锣烧': { cal: 180, cuisine: '日本料理' },
    '大福': { cal: 150, cuisine: '日本料理' },
    '抹茶蛋糕': { cal: 300, cuisine: '日本料理' },
    '和果子': { cal: 160, cuisine: '日本料理' },
    '红豆年糕汤': { cal: 180, cuisine: '日本料理' },
    '日式炒面': { cal: 380, cuisine: '日本料理' },
    '明太子': { cal: 120, cuisine: '日本料理' },
    '鲑鱼饭': { cal: 350, cuisine: '日本料理' },
    '日式蛋包饭': { cal: 420, cuisine: '日本料理' },
    '日式炸猪排': { cal: 480, cuisine: '日本料理' },
    '日式蟹肉饼': { cal: 250, cuisine: '日本料理' },
    '抹茶冰淇淋': { cal: 200, cuisine: '日本料理' },
    '烤鳗鱼': { cal: 300, cuisine: '日本料理' },
    '日式炸虾': { cal: 260, cuisine: '日本料理' },
    '日式汉堡排': { cal: 350, cuisine: '日本料理' },
    '日式和牛': { cal: 500, cuisine: '日本料理' },
    '日式土豆沙拉': { cal: 200, cuisine: '日本料理' },
    '日式茶泡饭': { cal: 220, cuisine: '日本料理' },
    '日式鲑鱼': { cal: 200, cuisine: '日本料理' },
    '日式秋刀鱼': { cal: 180, cuisine: '日本料理' },
    '日式烤鱼': { cal: 200, cuisine: '日本料理' },
    '日式串烧': { cal: 220, cuisine: '日本料理' },
    '日式羊羹': { cal: 180, cuisine: '日本料理' },
    '日式鲷鱼烧': { cal: 170, cuisine: '日本料理' },
    '日式红豆饼': { cal: 160, cuisine: '日本料理' },
    '日式仙贝': { cal: 120, cuisine: '日本料理' },
    '日式米果': { cal: 130, cuisine: '日本料理' },
    '日式什锦烧': { cal: 280, cuisine: '日本料理' },
    '日式冷乌冬': { cal: 300, cuisine: '日本料理' },
    '日式咖喱乌冬': { cal: 380, cuisine: '日本料理' },
    '鳗鱼寿司': { cal: 250, cuisine: '日本料理' },
    '三文鱼寿司': { cal: 220, cuisine: '日本料理' },
    '玉子寿司': { cal: 160, cuisine: '日本料理' },
    '海苔寿司': { cal: 180, cuisine: '日本料理' },
    '日式手卷': { cal: 200, cuisine: '日本料理' },
    '日式稻荷寿司': { cal: 200, cuisine: '日本料理' },
    '日式散寿司': { cal: 280, cuisine: '日本料理' },
    '日式炙寿司': { cal: 230, cuisine: '日本料理' },
    '日式军舰卷': { cal: 210, cuisine: '日本料理' },
    '日式亲子锅': { cal: 350, cuisine: '日本料理' },
    '日式天妇罗饭': { cal: 400, cuisine: '日本料理' },
    '日式抹茶拿铁': { cal: 120, cuisine: '日本料理' },
    '日式焙茶': { cal: 5, cuisine: '日本料理' },
    '韩式炸鸡': { cal: 350, cuisine: '韩国料理' },
    '部队锅': { cal: 400, cuisine: '韩国料理' },
    '石锅拌饭': { cal: 420, cuisine: '韩国料理' },
    '泡菜': { cal: 30, cuisine: '韩国料理' },
    '韩式冷面': { cal: 350, cuisine: '韩国料理' },
    '韩式炒年糕': { cal: 350, cuisine: '韩国料理' },
    '韩式烤肉': { cal: 380, cuisine: '韩国料理' },
    '韩式紫菜包饭': { cal: 280, cuisine: '韩国料理' },
    '大酱汤': { cal: 90, cuisine: '韩国料理' },
    '参鸡汤': { cal: 250, cuisine: '韩国料理' },
    '辣炒鱿鱼': { cal: 220, cuisine: '韩国料理' },
    '韩式炸酱面': { cal: 420, cuisine: '韩国料理' },
    '海鲜葱饼': { cal: 250, cuisine: '韩国料理' },
    '米肠': { cal: 220, cuisine: '韩国料理' },
    '炒码面': { cal: 400, cuisine: '韩国料理' },
    '辣白菜': { cal: 30, cuisine: '韩国料理' },
    '安东炖鸡': { cal: 320, cuisine: '韩国料理' },
    '烤牛肠': { cal: 300, cuisine: '韩国料理' },
    '辣豆腐汤': { cal: 120, cuisine: '韩国料理' },
    '杂菜': { cal: 200, cuisine: '韩国料理' },
    '韩式糖醋肉': { cal: 380, cuisine: '韩国料理' },
    '海苔汤': { cal: 40, cuisine: '韩国料理' },
    '韩式煎饼': { cal: 240, cuisine: '韩国料理' },
    '炒粉丝': { cal: 220, cuisine: '韩国料理' },
    '辣炒猪肉': { cal: 300, cuisine: '韩国料理' },
    '部队汤': { cal: 300, cuisine: '韩国料理' },
    '韩式炖排骨': { cal: 360, cuisine: '韩国料理' },
    '韩式拌饭': { cal: 380, cuisine: '韩国料理' },
    '韩式鱼饼汤': { cal: 150, cuisine: '韩国料理' },
    '韩式辣煮猪骨': { cal: 380, cuisine: '韩国料理' },
    '韩式烤鳗鱼': { cal: 300, cuisine: '韩国料理' },
    '韩式酿豆腐': { cal: 200, cuisine: '韩国料理' },
    '韩式蒸蛋': { cal: 90, cuisine: '韩国料理' },
    '韩式年糕汤': { cal: 320, cuisine: '韩国料理' },
    '韩式紫菜汤': { cal: 40, cuisine: '韩国料理' },
    '韩式辣白菜汤': { cal: 80, cuisine: '韩国料理' },
    '韩式烤牛小排': { cal: 420, cuisine: '韩国料理' },
    '韩式炸鱿鱼': { cal: 260, cuisine: '韩国料理' },
    '韩式糖饼': { cal: 240, cuisine: '韩国料理' },
    '韩式土豆饼': { cal: 220, cuisine: '韩国料理' },
    '韩式海鲜乌冬': { cal: 360, cuisine: '韩国料理' },
    '韩式鱼饼': { cal: 150, cuisine: '韩国料理' },
    '韩式血肠': { cal: 220, cuisine: '韩国料理' },
    '韩式萝卜块': { cal: 40, cuisine: '韩国料理' },
    '韩式腌萝卜': { cal: 40, cuisine: '韩国料理' },
    '韩式辣炒八爪鱼': { cal: 240, cuisine: '韩国料理' },
    '韩式海鲜面': { cal: 380, cuisine: '韩国料理' },
    '韩式酿辣椒': { cal: 180, cuisine: '韩国料理' },
    '韩式烤秋刀鱼': { cal: 180, cuisine: '韩国料理' },
    '韩式煎鱿鱼': { cal: 220, cuisine: '韩国料理' },
    '韩式蜂蜜炸鸡': { cal: 360, cuisine: '韩国料理' },
    '冬阴功汤': { cal: 150, cuisine: '泰国菜' },
    '泰式炒河粉': { cal: 450, cuisine: '泰国菜' },
    '青木瓜沙拉': { cal: 120, cuisine: '泰国菜' },
    '芒果糯米饭': { cal: 300, cuisine: '泰国菜' },
    '泰式绿咖喱鸡': { cal: 320, cuisine: '泰国菜' },
    '泰式红咖喱': { cal: 320, cuisine: '泰国菜' },
    '泰式黄咖喱': { cal: 320, cuisine: '泰国菜' },
    '椰汁鸡汤': { cal: 180, cuisine: '泰国菜' },
    '泰式炒饭': { cal: 380, cuisine: '泰国菜' },
    '菠萝炒饭': { cal: 400, cuisine: '泰国菜' },
    '烤猪颈肉': { cal: 300, cuisine: '泰国菜' },
    '泰式烤鸡': { cal: 280, cuisine: '泰国菜' },
    '虾饼': { cal: 250, cuisine: '泰国菜' },
    '泰式春卷': { cal: 180, cuisine: '泰国菜' },
    '芒果沙拉': { cal: 130, cuisine: '泰国菜' },
    '泰式奶茶': { cal: 200, cuisine: '泰国菜' },
    '椰奶冻': { cal: 200, cuisine: '泰国菜' },
    '香蕉煎饼': { cal: 320, cuisine: '泰国菜' },
    '打抛猪': { cal: 300, cuisine: '泰国菜' },
    '柠檬鱼': { cal: 240, cuisine: '泰国菜' },
    '泰式河粉': { cal: 360, cuisine: '泰国菜' },
    '椰香饭': { cal: 280, cuisine: '泰国菜' },
    '九层塔炒肉': { cal: 280, cuisine: '泰国菜' },
    '泰式酸辣虾': { cal: 200, cuisine: '泰国菜' },
    '青咖喱': { cal: 320, cuisine: '泰国菜' },
    '黄咖喱蟹': { cal: 380, cuisine: '泰国菜' },
    '猪脚饭': { cal: 450, cuisine: '泰国菜' },
    '泰式凉拌海鲜': { cal: 180, cuisine: '泰国菜' },
    '椰汁西米露': { cal: 180, cuisine: '泰国菜' },
    '泰式椰青': { cal: 60, cuisine: '泰国菜' },
    '泰式炒空心菜': { cal: 100, cuisine: '泰国菜' },
    '泰式咸蛋': { cal: 90, cuisine: '泰国菜' },
    '泰式烤虾': { cal: 200, cuisine: '泰国菜' },
    '泰式椰奶布丁': { cal: 200, cuisine: '泰国菜' },
    '泰式香蕉船': { cal: 280, cuisine: '泰国菜' },
    '泰式炒面': { cal: 400, cuisine: '泰国菜' },
    '泰式柚子沙拉': { cal: 130, cuisine: '泰国菜' },
    '泰式海鲜沙拉': { cal: 160, cuisine: '泰国菜' },
    '泰式牛肉沙拉': { cal: 160, cuisine: '泰国菜' },
    '泰式椰汁糕': { cal: 180, cuisine: '泰国菜' },
    '泰式芒果冻': { cal: 150, cuisine: '泰国菜' },
    '泰式烤肉串': { cal: 250, cuisine: '泰国菜' },
    '泰式鱼饼': { cal: 180, cuisine: '泰国菜' },
    '泰式糯米鸡': { cal: 260, cuisine: '泰国菜' },
    '泰式红宝石': { cal: 160, cuisine: '泰国菜' },
    '泰式虾卷': { cal: 150, cuisine: '泰国菜' },
    '越南河粉': { cal: 360, cuisine: '越南菜' },
    '越南春卷': { cal: 180, cuisine: '越南菜' },
    '越南三明治': { cal: 320, cuisine: '越南菜' },
    '越南咖啡': { cal: 60, cuisine: '越南菜' },
    '越南米粉': { cal: 340, cuisine: '越南菜' },
    '烤肉米粉': { cal: 380, cuisine: '越南菜' },
    '越南法棍': { cal: 280, cuisine: '越南菜' },
    '甘蔗虾': { cal: 220, cuisine: '越南菜' },
    '越南米纸卷': { cal: 150, cuisine: '越南菜' },
    '越南煎饼': { cal: 240, cuisine: '越南菜' },
    '越南酸汤': { cal: 120, cuisine: '越南菜' },
    '越南糯米饭': { cal: 280, cuisine: '越南菜' },
    '烤肉饭': { cal: 420, cuisine: '越南菜' },
    '越南鸡饭': { cal: 400, cuisine: '越南菜' },
    '越式凉拌': { cal: 120, cuisine: '越南菜' },
    '越南肠粉': { cal: 200, cuisine: '越南菜' },
    '滴漏咖啡': { cal: 50, cuisine: '越南菜' },
    '越南米卷': { cal: 150, cuisine: '越南菜' },
    '越南椰汁糕': { cal: 180, cuisine: '越南菜' },
    '越南绿豆糕': { cal: 160, cuisine: '越南菜' },
    '越南咖啡冻': { cal: 160, cuisine: '越南菜' },
    '越南咸咖啡': { cal: 70, cuisine: '越南菜' },
    '越南烤肉串': { cal: 250, cuisine: '越南菜' },
    '越南虾饼': { cal: 200, cuisine: '越南菜' },
    '越南蔗虾': { cal: 220, cuisine: '越南菜' },
    '越南烤肉丸': { cal: 200, cuisine: '越南菜' },
    '海南鸡饭': { cal: 430, cuisine: '东南亚' },
    '叻沙': { cal: 380, cuisine: '东南亚' },
    '椰浆饭': { cal: 360, cuisine: '东南亚' },
    '辣椒蟹': { cal: 320, cuisine: '东南亚' },
    '肉骨茶': { cal: 300, cuisine: '东南亚' },
    '沙爹': { cal: 250, cuisine: '东南亚' },
    '槟城炒粿条': { cal: 400, cuisine: '东南亚' },
    '印尼炒饭': { cal: 400, cuisine: '东南亚' },
    '印度咖喱鸡': { cal: 320, cuisine: '东南亚' },
    '印度飞饼': { cal: 280, cuisine: '东南亚' },
    '玛莎拉鸡': { cal: 330, cuisine: '东南亚' },
    '印度香饭': { cal: 400, cuisine: '东南亚' },
    '印度咖喱角': { cal: 200, cuisine: '东南亚' },
    '印度奶茶': { cal: 150, cuisine: '东南亚' },
    '孜然土豆': { cal: 160, cuisine: '东南亚' },
    '印度煎饼': { cal: 200, cuisine: '东南亚' },
    '奶油鸡': { cal: 340, cuisine: '东南亚' },
    '沙爹肉串': { cal: 250, cuisine: '东南亚' },
    '咖椰吐司': { cal: 250, cuisine: '东南亚' },
    '马来炒面': { cal: 380, cuisine: '东南亚' },
    '印度菠菜奶酪': { cal: 220, cuisine: '东南亚' },
    '孟加拉咖喱': { cal: 320, cuisine: '东南亚' },
    '印度咖喱蔬菜': { cal: 220, cuisine: '东南亚' },
    '印度奶酪球': { cal: 200, cuisine: '东南亚' },
    '印尼加多加多': { cal: 220, cuisine: '东南亚' },
    '菲律宾酸汤': { cal: 160, cuisine: '东南亚' },
    '缅甸鱼汤面': { cal: 340, cuisine: '东南亚' },
    '柬埔寨青芒果沙拉': { cal: 120, cuisine: '东南亚' },
    '马来西亚椰糖糕': { cal: 180, cuisine: '东南亚' },
    '印尼椰浆饭': { cal: 360, cuisine: '东南亚' },
    '印度玛莎拉多萨': { cal: 240, cuisine: '东南亚' },
    '牛排': { cal: 450, cuisine: '西餐' },
    '意大利肉酱面': { cal: 420, cuisine: '西餐' },
    '凯撒沙拉': { cal: 180, cuisine: '西餐' },
    '希腊沙拉': { cal: 160, cuisine: '西餐' },
    '三文鱼排': { cal: 280, cuisine: '西餐' },
    '烤鸡': { cal: 300, cuisine: '西餐' },
    '洋葱圈': { cal: 280, cuisine: '西餐' },
    '炸鱼薯条': { cal: 500, cuisine: '西餐' },
    '玉米浓汤': { cal: 150, cuisine: '西餐' },
    '奶油蘑菇汤': { cal: 180, cuisine: '西餐' },
    '苹果派': { cal: 300, cuisine: '西餐' },
    '布朗尼': { cal: 320, cuisine: '西餐' },
    '巧克力蛋糕': { cal: 350, cuisine: '西餐' },
    '华夫饼': { cal: 280, cuisine: '西餐' },
    '松饼': { cal: 260, cuisine: '西餐' },
    '班尼迪克蛋': { cal: 300, cuisine: '西餐' },
    '法式吐司': { cal: 280, cuisine: '西餐' },
    '千层面': { cal: 420, cuisine: '西餐' },
    '奶油培根意面': { cal: 450, cuisine: '西餐' },
    '蒜香面包': { cal: 200, cuisine: '西餐' },
    '烤肋排': { cal: 480, cuisine: '西餐' },
    '惠灵顿牛排': { cal: 520, cuisine: '西餐' },
    '红酒炖牛肉': { cal: 350, cuisine: '西餐' },
    '西班牙海鲜饭': { cal: 420, cuisine: '西餐' },
    '塔可': { cal: 220, cuisine: '西餐' },
    '墨西哥卷': { cal: 320, cuisine: '西餐' },
    '玉米片': { cal: 200, cuisine: '西餐' },
    '莎莎酱': { cal: 40, cuisine: '西餐' },
    '鳄梨酱': { cal: 150, cuisine: '西餐' },
    '墨西哥卷饼': { cal: 340, cuisine: '西餐' },
    '美式煎蛋': { cal: 140, cuisine: '西餐' },
    '烤土豆皮': { cal: 280, cuisine: '西餐' },
    '芝士焗薯泥': { cal: 260, cuisine: '西餐' },
    '热可可': { cal: 180, cuisine: '西餐' },
    '美式松饼': { cal: 280, cuisine: '西餐' },
    '法式洋葱汤': { cal: 160, cuisine: '西餐' },
    '法式焗蜗牛': { cal: 220, cuisine: '西餐' },
    '法式鹅肝': { cal: 300, cuisine: '西餐' },
    '意式烩饭': { cal: 380, cuisine: '西餐' },
    '意式番茄面包': { cal: 180, cuisine: '西餐' },
    '德式香肠': { cal: 300, cuisine: '西餐' },
    '德式猪脚': { cal: 450, cuisine: '西餐' },
    '西班牙蒜油虾': { cal: 200, cuisine: '西餐' },
    '西班牙土豆饼': { cal: 220, cuisine: '西餐' },
    '美式薯泥': { cal: 180, cuisine: '西餐' },
    '夏威夷披萨': { cal: 400, cuisine: '西餐' },
    '披萨卷': { cal: 320, cuisine: '西餐' },
    '芝士条': { cal: 260, cuisine: '西餐' },
    '枫糖华夫': { cal: 300, cuisine: '西餐' },
    '巧克力华夫': { cal: 320, cuisine: '西餐' },
    '蓝莓松饼': { cal: 280, cuisine: '西餐' },
    '奶油烤龙虾': { cal: 380, cuisine: '西餐' },
    '烤扇贝': { cal: 180, cuisine: '西餐' },
    '英式牧羊人派': { cal: 350, cuisine: '西餐' },
    '苏格兰蛋': { cal: 250, cuisine: '西餐' },
    '美式玉米狗': { cal: 260, cuisine: '西餐' },
    '美式早餐': { cal: 400, cuisine: '西餐' },
    '欧式早餐': { cal: 350, cuisine: '西餐' },
    '意式香肠': { cal: 300, cuisine: '西餐' },
    '西班牙海鲜汤': { cal: 160, cuisine: '西餐' },
    '法式可丽饼': { cal: 260, cuisine: '西餐' },
    '德式酸菜': { cal: 80, cuisine: '西餐' },
    '波兰饺子': { cal: 280, cuisine: '西餐' },
    '俄罗斯饺子': { cal: 280, cuisine: '西餐' },
    '瑞典肉丸': { cal: 300, cuisine: '西餐' },
    '丹麦酥': { cal: 260, cuisine: '西餐' },
    '土耳其烤肉卷': { cal: 340, cuisine: '西餐' },
    '土耳其甜点': { cal: 280, cuisine: '西餐' },
    '希腊慕萨卡': { cal: 320, cuisine: '西餐' },
    '黎巴嫩烤肉': { cal: 320, cuisine: '西餐' },
    '埃及蚕豆': { cal: 160, cuisine: '西餐' },
    '摩洛哥塔吉锅': { cal: 350, cuisine: '西餐' },
    '埃塞俄比亚炖菜': { cal: 280, cuisine: '西餐' },
    '南非烤肉': { cal: 380, cuisine: '西餐' },
    '巴西烤肉': { cal: 400, cuisine: '西餐' },
    '阿根廷牛排': { cal: 480, cuisine: '西餐' },
    '墨西哥辣酱汤': { cal: 160, cuisine: '西餐' },
    '古巴三明治': { cal: 320, cuisine: '西餐' },
    '加勒比烤鸡': { cal: 280, cuisine: '西餐' },
    '土耳其披萨': { cal: 360, cuisine: '西餐' },
    '鹰嘴豆泥': { cal: 160, cuisine: '西餐' },
    '皮塔饼': { cal: 220, cuisine: '西餐' },
    '沙威玛': { cal: 320, cuisine: '西餐' },
    '缅甸茶叶沙拉': { cal: 140, cuisine: '西餐' },
    '菲律宾阿多波': { cal: 300, cuisine: '西餐' },
    '柬埔寨阿莫克鱼': { cal: 260, cuisine: '西餐' },
    '尼泊尔蒸饺': { cal: 220, cuisine: '西餐' },
    '斯里兰卡咖喱': { cal: 300, cuisine: '西餐' },
    '中东烤肉': { cal: 320, cuisine: '西餐' },
    '黎巴嫩沙拉': { cal: 140, cuisine: '西餐' },
    '阿富汗抓饭': { cal: 400, cuisine: '西餐' },
    '蒙古烤肉': { cal: 360, cuisine: '西餐' },
    '土耳其烤肉串': { cal: 320, cuisine: '西餐' },
    '墨西哥玉米汤': { cal: 150, cuisine: '西餐' },
    /* —— 国内菜品补充（京津/本帮/鄂/豫/晋/陕/赣/台/素/火锅/粥/卤味等） —— */
    '涮羊肉': { cal: 320, cuisine: '京津菜' },
    '卤煮': { cal: 350, cuisine: '京津菜' },
    '炒肝': { cal: 200, cuisine: '京津菜' },
    '爆肚': { cal: 150, cuisine: '京津菜' },
    '门钉肉饼': { cal: 300, cuisine: '京津菜' },
    '褡裢火烧': { cal: 280, cuisine: '京津菜' },
    '炸灌肠': { cal: 250, cuisine: '京津菜' },
    '芥末墩': { cal: 80, cuisine: '京津菜' },
    '京酱肉丝': { cal: 280, cuisine: '京津菜' },
    '宫廷奶酪': { cal: 180, cuisine: '京津菜' },
    '栗子糕': { cal: 200, cuisine: '京津菜' },
    '干炸丸子': { cal: 300, cuisine: '京津菜' },
    '它似蜜': { cal: 260, cuisine: '京津菜' },
    '抓炒鱼片': { cal: 260, cuisine: '京津菜' },
    '砂锅白肉': { cal: 320, cuisine: '京津菜' },
    '芸豆卷': { cal: 160, cuisine: '京津菜' },
    '北京烧羊肉': { cal: 330, cuisine: '京津菜' },
    '芫爆肚丝': { cal: 160, cuisine: '京津菜' },
    '油爆虾': { cal: 220, cuisine: '上海本帮' },
    '八宝鸭': { cal: 380, cuisine: '上海本帮' },
    '腌笃鲜': { cal: 220, cuisine: '上海本帮' },
    '草头圈子': { cal: 260, cuisine: '上海本帮' },
    '红烧划水': { cal: 240, cuisine: '上海本帮' },
    '糟钵头': { cal: 260, cuisine: '上海本帮' },
    '扣三丝': { cal: 160, cuisine: '上海本帮' },
    '本帮熏鱼': { cal: 280, cuisine: '上海本帮' },
    '糖醋小排': { cal: 360, cuisine: '上海本帮' },
    '上海葱油拌面': { cal: 380, cuisine: '上海本帮' },
    '排骨年糕': { cal: 400, cuisine: '上海本帮' },
    '生煎': { cal: 300, cuisine: '上海本帮' },
    '糟卤': { cal: 120, cuisine: '上海本帮' },
    '草头': { cal: 90, cuisine: '上海本帮' },
    '上海油爆河虾': { cal: 220, cuisine: '上海本帮' },
    '本帮酱肉': { cal: 320, cuisine: '上海本帮' },
    '上海酱鸭': { cal: 300, cuisine: '上海本帮' },
    '武昌鱼': { cal: 220, cuisine: '湖北菜' },
    '珍珠丸子': { cal: 260, cuisine: '湖北菜' },
    '沔阳三蒸': { cal: 300, cuisine: '湖北菜' },
    '鱼糕': { cal: 200, cuisine: '湖北菜' },
    '腊肉炒菜苔': { cal: 180, cuisine: '湖北菜' },
    '潜江油焖大虾': { cal: 320, cuisine: '湖北菜' },
    '洪山菜苔': { cal: 120, cuisine: '湖北菜' },
    '荆沙甲鱼': { cal: 320, cuisine: '湖北菜' },
    '黄陂三合': { cal: 280, cuisine: '湖北菜' },
    '蒸鱼丸': { cal: 180, cuisine: '湖北菜' },
    '湖北鱼丸': { cal: 180, cuisine: '湖北菜' },
    '豆丝': { cal: 260, cuisine: '湖北菜' },
    '糊汤粉': { cal: 300, cuisine: '湖北菜' },
    '粉蒸肉': { cal: 320, cuisine: '湖北菜' },
    '湖北鱼面': { cal: 300, cuisine: '湖北菜' },
    '武汉热干面': { cal: 400, cuisine: '湖北菜' },
    '荆沙鱼糕': { cal: 220, cuisine: '湖北菜' },
    '烩面': { cal: 400, cuisine: '河南菜' },
    '灌汤包': { cal: 280, cuisine: '河南菜' },
    '鲤鱼焙面': { cal: 320, cuisine: '河南菜' },
    '道口烧鸡': { cal: 280, cuisine: '河南菜' },
    '烩面片': { cal: 380, cuisine: '河南菜' },
    '焖子': { cal: 220, cuisine: '河南菜' },
    '浆面条': { cal: 320, cuisine: '河南菜' },
    '蒸饺': { cal: 300, cuisine: '河南菜' },
    '炸八块': { cal: 300, cuisine: '河南菜' },
    '桶子鸡': { cal: 260, cuisine: '河南菜' },
    '变蛋': { cal: 80, cuisine: '河南菜' },
    '皮渣': { cal: 200, cuisine: '河南菜' },
    '羊肉烩面': { cal: 420, cuisine: '河南菜' },
    '牛肉烩面': { cal: 420, cuisine: '河南菜' },
    '扣碗': { cal: 300, cuisine: '河南菜' },
    '洛阳水席': { cal: 360, cuisine: '河南菜' },
    '连汤肉片': { cal: 260, cuisine: '河南菜' },
    '焦炸丸子': { cal: 280, cuisine: '河南菜' },
    '河南焖面': { cal: 360, cuisine: '河南菜' },
    '刀削面': { cal: 380, cuisine: '山西菜' },
    '剔尖': { cal: 340, cuisine: '山西菜' },
    '莜面栲栳栳': { cal: 300, cuisine: '山西菜' },
    '过油肉': { cal: 320, cuisine: '山西菜' },
    '猫耳朵': { cal: 320, cuisine: '山西菜' },
    '焖面': { cal: 360, cuisine: '山西菜' },
    '碗托': { cal: 180, cuisine: '山西菜' },
    '头脑': { cal: 220, cuisine: '山西菜' },
    '灌肠': { cal: 200, cuisine: '山西菜' },
    '糖醋丸子': { cal: 300, cuisine: '山西菜' },
    '定襄蒸肉': { cal: 280, cuisine: '山西菜' },
    '羊杂割': { cal: 220, cuisine: '山西菜' },
    '擦圪蚪': { cal: 320, cuisine: '山西菜' },
    '莜面鱼鱼': { cal: 280, cuisine: '山西菜' },
    '山西抿尖': { cal: 320, cuisine: '山西菜' },
    '葫芦头': { cal: 320, cuisine: '陕西菜' },
    '饺子宴': { cal: 360, cuisine: '陕西菜' },
    '温拌腰丝': { cal: 200, cuisine: '陕西菜' },
    '奶汤锅子鱼': { cal: 260, cuisine: '陕西菜' },
    '泡泡油糕': { cal: 240, cuisine: '陕西菜' },
    '金线油塔': { cal: 200, cuisine: '陕西菜' },
    '岐山臊子面': { cal: 380, cuisine: '陕西菜' },
    '肉丸胡辣汤': { cal: 180, cuisine: '陕西菜' },
    '甑糕': { cal: 260, cuisine: '陕西菜' },
    '柿子饼': { cal: 220, cuisine: '陕西菜' },
    '陕北炖羊肉': { cal: 320, cuisine: '陕西菜' },
    '浆水鱼鱼': { cal: 200, cuisine: '陕西菜' },
    '陕西烩麻食': { cal: 300, cuisine: '陕西菜' },
    '西安糊辣汤': { cal: 180, cuisine: '陕西菜' },
    '藜蒿炒腊肉': { cal: 200, cuisine: '江西菜' },
    '萍乡辣子鸡': { cal: 360, cuisine: '江西菜' },
    '余干椒炒肉': { cal: 260, cuisine: '江西菜' },
    '米粉蒸肉': { cal: 320, cuisine: '江西菜' },
    '鄱湖胖鱼头': { cal: 280, cuisine: '江西菜' },
    '井冈山烟笋': { cal: 160, cuisine: '江西菜' },
    '南昌凉拌藕': { cal: 120, cuisine: '江西菜' },
    '文蛤蒸蛋': { cal: 160, cuisine: '江西菜' },
    '兴国米粉鱼': { cal: 300, cuisine: '江西菜' },
    '萍乡小炒肉': { cal: 280, cuisine: '江西菜' },
    '赣南小炒鱼': { cal: 240, cuisine: '江西菜' },
    '庐山石鸡': { cal: 260, cuisine: '江西菜' },
    '南昌炒粉': { cal: 380, cuisine: '江西菜' },
    '九江茶饼': { cal: 180, cuisine: '江西菜' },
    '弋阳年糕': { cal: 260, cuisine: '江西菜' },
    '灯芯糕': { cal: 160, cuisine: '江西菜' },
    '江西瓦罐汤': { cal: 200, cuisine: '江西菜' },
    '卤肉饭': { cal: 430, cuisine: '台湾菜' },
    '台湾牛肉面': { cal: 450, cuisine: '台湾菜' },
    '三杯鸡': { cal: 320, cuisine: '台湾菜' },
    '蚵仔煎': { cal: 280, cuisine: '台湾菜' },
    '刈包': { cal: 260, cuisine: '台湾菜' },
    '大肠包小肠': { cal: 320, cuisine: '台湾菜' },
    '担仔面': { cal: 380, cuisine: '台湾菜' },
    '凤梨酥': { cal: 200, cuisine: '台湾菜' },
    '棺材板': { cal: 320, cuisine: '台湾菜' },
    '芋头糕': { cal: 200, cuisine: '台湾菜' },
    '葱抓饼': { cal: 280, cuisine: '台湾菜' },
    '盐酥鸡': { cal: 320, cuisine: '台湾菜' },
    '蚵仔面线': { cal: 300, cuisine: '台湾菜' },
    '卤味': { cal: 200, cuisine: '台湾菜' },
    '黑糖刨冰': { cal: 200, cuisine: '台湾菜' },
    '麻油鸡': { cal: 280, cuisine: '台湾菜' },
    '姜母鸭': { cal: 320, cuisine: '台湾菜' },
    '万峦猪脚': { cal: 380, cuisine: '台湾菜' },
    '台湾卤肉': { cal: 400, cuisine: '台湾菜' },
    '台湾蚵仔煎': { cal: 280, cuisine: '台湾菜' },
    '罗汉斋': { cal: 160, cuisine: '素食' },
    '素鸭': { cal: 180, cuisine: '素食' },
    '素红烧肉': { cal: 200, cuisine: '素食' },
    '香菇菜心': { cal: 120, cuisine: '素食' },
    '素狮子头': { cal: 200, cuisine: '素食' },
    '凉拌木耳': { cal: 90, cuisine: '素食' },
    '素春卷': { cal: 160, cuisine: '素食' },
    '南瓜羹': { cal: 120, cuisine: '素食' },
    '银耳莲子羹': { cal: 140, cuisine: '素食' },
    '素佛跳墙': { cal: 180, cuisine: '素食' },
    '铁板豆腐': { cal: 200, cuisine: '素食' },
    '干煸四季豆': { cal: 160, cuisine: '素食' },
    '凉拌海带丝': { cal: 80, cuisine: '素食' },
    '香菇油菜': { cal: 100, cuisine: '素食' },
    '素鲍鱼': { cal: 160, cuisine: '素食' },
    '四喜烤麸': { cal: 220, cuisine: '素食' },
    '凉拌黄瓜': { cal: 80, cuisine: '素食' },
    '凉拌土豆丝': { cal: 120, cuisine: '素食' },
    '凉拌腐竹': { cal: 120, cuisine: '素食' },
    '香菇焖笋': { cal: 140, cuisine: '素食' },
    '潮汕牛肉火锅': { cal: 420, cuisine: '火锅' },
    '椰子鸡火锅': { cal: 360, cuisine: '火锅' },
    '酸汤鱼火锅': { cal: 320, cuisine: '火锅' },
    '冒菜': { cal: 320, cuisine: '火锅' },
    '串串香': { cal: 350, cuisine: '火锅' },
    '麻辣火锅': { cal: 450, cuisine: '火锅' },
    '番茄锅': { cal: 200, cuisine: '火锅' },
    '菌汤锅': { cal: 180, cuisine: '火锅' },
    '鸳鸯锅': { cal: 380, cuisine: '火锅' },
    '猪肚鸡火锅': { cal: 340, cuisine: '火锅' },
    '九宫格火锅': { cal: 460, cuisine: '火锅' },
    '冷锅串串': { cal: 340, cuisine: '火锅' },
    '麻辣香锅': { cal: 400, cuisine: '火锅' },
    '重庆老火锅': { cal: 480, cuisine: '火锅' },
    '花胶鸡火锅': { cal: 380, cuisine: '火锅' },
    '粥底火锅': { cal: 300, cuisine: '火锅' },
    '鱼火锅': { cal: 320, cuisine: '火锅' },
    '生滚粥': { cal: 180, cuisine: '早点粥品' },
    '鱼片粥': { cal: 200, cuisine: '早点粥品' },
    '瘦肉粥': { cal: 180, cuisine: '早点粥品' },
    '南瓜粥': { cal: 120, cuisine: '早点粥品' },
    '紫薯粥': { cal: 140, cuisine: '早点粥品' },
    '海鲜粥': { cal: 220, cuisine: '早点粥品' },
    '鸡丝粥': { cal: 180, cuisine: '早点粥品' },
    '蔬菜粥': { cal: 120, cuisine: '早点粥品' },
    '红枣粥': { cal: 140, cuisine: '早点粥品' },
    '皮蛋粥': { cal: 180, cuisine: '早点粥品' },
    '玉米粥': { cal: 120, cuisine: '早点粥品' },
    '红豆粥': { cal: 160, cuisine: '早点粥品' },
    '绿豆粥': { cal: 120, cuisine: '早点粥品' },
    '燕麦粥': { cal: 160, cuisine: '早点粥品' },
    '淮山粥': { cal: 140, cuisine: '早点粥品' },
    '青菜粥': { cal: 120, cuisine: '早点粥品' },
    '潮汕砂锅粥': { cal: 240, cuisine: '早点粥品' },
    '拍黄瓜': { cal: 80, cuisine: '凉菜卤味' },
    '卤牛肉': { cal: 280, cuisine: '凉菜卤味' },
    '酱牛肉': { cal: 300, cuisine: '凉菜卤味' },
    '凉拌豆腐丝': { cal: 100, cuisine: '凉菜卤味' },
    '凉拌粉皮': { cal: 140, cuisine: '凉菜卤味' },
    '酸辣蕨根粉': { cal: 180, cuisine: '凉菜卤味' },
    '老醋花生': { cal: 200, cuisine: '凉菜卤味' },
    '凉拌苦瓜': { cal: 80, cuisine: '凉菜卤味' },
    '凉拌豆角': { cal: 120, cuisine: '凉菜卤味' },
    '皮蛋拌豆腐': { cal: 140, cuisine: '凉菜卤味' },
    '凉拌莴笋': { cal: 80, cuisine: '凉菜卤味' },
    '红油耳片': { cal: 220, cuisine: '凉菜卤味' },
    '卤猪蹄': { cal: 380, cuisine: '凉菜卤味' },
    '卤鸡爪': { cal: 180, cuisine: '凉菜卤味' },
    '卤蛋': { cal: 90, cuisine: '凉菜卤味' },
    '凉拌土豆丝': { cal: 120, cuisine: '凉菜卤味' },
    '凉拌腐竹': { cal: 120, cuisine: '凉菜卤味' },
    '红油肚丝': { cal: 200, cuisine: '凉菜卤味' },
    '卤鸭脖': { cal: 180, cuisine: '凉菜卤味' },
    '卤鸭翅': { cal: 150, cuisine: '凉菜卤味' },
    '采石矶茶干': { cal: 120, cuisine: '安徽菜' },
    '芜湖虾籽面': { cal: 320, cuisine: '安徽菜' },
    '安庆炒面': { cal: 360, cuisine: '安徽菜' },
    '阜阳格拉条': { cal: 380, cuisine: '安徽菜' },
    '安徽板鸭': { cal: 300, cuisine: '安徽菜' },
    '黄山小溪鱼': { cal: 200, cuisine: '安徽菜' },
    '徽式红烧肉': { cal: 420, cuisine: '安徽菜' },
    '安徽酱肉': { cal: 320, cuisine: '安徽菜' },
    '江淮一品锅': { cal: 380, cuisine: '安徽菜' },
    '安徽臭鳜鱼': { cal: 280, cuisine: '安徽菜' },
    '湖南米粉': { cal: 360, cuisine: '湖南小吃' },
    '常德牛肉粉': { cal: 380, cuisine: '湖南小吃' },
    '永州喝螺': { cal: 180, cuisine: '湖南小吃' },
    '湘西腊肉': { cal: 320, cuisine: '湖南小吃' },
    '醴陵炒粉': { cal: 380, cuisine: '湖南小吃' },
    '浏阳蒸菜': { cal: 260, cuisine: '湖南小吃' },
    '湖南腊鱼': { cal: 240, cuisine: '湖南小吃' },
    '宁乡花猪肉': { cal: 300, cuisine: '湖南小吃' },
    '岳阳姜辣蛇': { cal: 320, cuisine: '湖南小吃' },
    '湖南血粑鸭': { cal: 320, cuisine: '湖南小吃' },
    '长沙糖油粑粑': { cal: 250, cuisine: '湖南小吃' },
    '湖南擂辣椒': { cal: 80, cuisine: '湖南小吃' },
    '叉烧包': { cal: 200, cuisine: '广东小吃' },
    '奶黄包': { cal: 200, cuisine: '广东小吃' },
    '广式月饼': { cal: 280, cuisine: '广东小吃' },
    '广式腊味': { cal: 320, cuisine: '广东小吃' },
    '广式煎堆': { cal: 220, cuisine: '广东小吃' },
    '广式糖不甩': { cal: 200, cuisine: '广东小吃' },
    '广式萝卜糕': { cal: 180, cuisine: '广东小吃' },
    '虾饺皇': { cal: 180, cuisine: '广东小吃' },
    '凤爪': { cal: 160, cuisine: '广东小吃' },
    '广式流沙包': { cal: 250, cuisine: '广东小吃' },
    '闽南面线糊': { cal: 200, cuisine: '福建小吃' },
    '海蛎饼': { cal: 220, cuisine: '福建小吃' },
    '土笋冻': { cal: 120, cuisine: '福建小吃' },
    '泉州面线糊': { cal: 200, cuisine: '福建小吃' },
    '漳州卤面': { cal: 320, cuisine: '福建小吃' },
    '莆田卤面': { cal: 320, cuisine: '福建小吃' },
    '闽南咸饭': { cal: 280, cuisine: '福建小吃' },
    '福建光饼': { cal: 200, cuisine: '福建小吃' },
    '厦门薄饼': { cal: 240, cuisine: '福建小吃' },
    '福州肉松': { cal: 260, cuisine: '福建小吃' },
    '福州鱼丸': { cal: 200, cuisine: '福建小吃' },
    '闽南五香卷': { cal: 220, cuisine: '福建小吃' },
    '山东大包': { cal: 220, cuisine: '山东小吃' },
    '胶东海鲜': { cal: 260, cuisine: '山东小吃' },
    '青岛海鲜锅': { cal: 320, cuisine: '山东小吃' },
    '山东杂粮煎饼': { cal: 280, cuisine: '山东小吃' },
    '济南把子肉': { cal: 400, cuisine: '山东小吃' },
    '山东煎饼': { cal: 260, cuisine: '山东小吃' },
    '胶东大包': { cal: 240, cuisine: '山东小吃' },
    '德州扒鸡腿': { cal: 260, cuisine: '山东小吃' }
  };

  // 兼容旧字段：name -> cal 的扁平映射
  var DISHES = {};
  Object.keys(DISH_DB).forEach(function (k) { DISHES[k] = DISH_DB[k].cal; });

  function matchFood(name) {
    name = (name || '').trim();
    if (!name) return null;
    if (FOODS[name]) return { name: name, ref: FOODS[name] };
    var keys = Object.keys(FOODS);
    for (var i = 0; i < keys.length; i++) {
      if (name.indexOf(keys[i]) >= 0 || keys[i].indexOf(name) >= 0) return { name: keys[i], ref: FOODS[keys[i]] };
    }
    return null;
  }

  // 按菜名匹配菜系成品菜（精确 / 包含 / 反向包含），返回 { name, cal, cuisine, matched }
  function lookupDish(name) {
    name = (name || '').trim();
    if (!name) return null;
    if (DISH_DB[name]) return { name: name, cal: DISH_DB[name].cal, cuisine: DISH_DB[name].cuisine, matched: true };
    var keys = Object.keys(DISH_DB);
    // 优先包含匹配（菜名里含库名，如“妈妈做的宫保鸡丁”）
    for (var i = 0; i < keys.length; i++) {
      if (name.indexOf(keys[i]) >= 0) return { name: keys[i], cal: DISH_DB[keys[i]].cal, cuisine: DISH_DB[keys[i]].cuisine, matched: true };
    }
    // 再反向包含（库名里含输入，如“宫保”匹配“宫保鸡丁”）
    for (var j = 0; j < keys.length; j++) {
      if (keys[j].indexOf(name) >= 0) return { name: keys[j], cal: DISH_DB[keys[j]].cal, cuisine: DISH_DB[keys[j]].cuisine, matched: true };
    }
    return null;
  }

  // 解析一行食材：如 "鸡蛋 2个" / "番茄 1个" / "米饭 150克"
  function parseIngredientLine(line) {
    line = (line || '').trim();
    if (!line) return null;
    var m = line.match(/^([\u4e00-\u9fa5a-zA-Z]+)\s*([\d.]+)?\s*(克|g|G|毫升|ml|ML|个|只|根|片|块|份|碗|杯|勺|把|瓣|颗|粒)?/);
    var name = m ? m[1] : line;
    var qty = m && m[2] ? parseFloat(m[2]) : 1;
    var unit = m && m[3] ? m[3] : '';
    var hit = matchFood(name);
    if (!hit) return { name: name, qty: qty, unit: unit, calories: 0, matched: false };
    var grams;
    if (unit === '克' || unit === 'g' || unit === 'G' || unit === '毫升' || unit === 'ml' || unit === 'ML') grams = qty;
    else grams = qty * (hit.ref.gram || 100);
    var cal = Math.round(hit.ref.cal / 100 * grams);
    return { name: name, qty: qty, unit: unit, grams: Math.round(grams), calories: cal, matched: true };
  }

  // 根据食材文本行自动汇总热量（用于菜谱保存）
  function calcRecipeCalorie(linesText) {
    var lines = (linesText || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    var total = 0, known = 0;
    lines.forEach(function (l) {
      var p = parseIngredientLine(l);
      if (p && p.matched) { total += p.calories; known++; }
    });
    return { total: total, known: known, lines: lines.length };
  }

  // 综合估算：优先食材明细，其次菜名匹配菜系菜谱
  // 返回 { total, source:'ingredient'|'dish'|'none', dish:{name,cuisine,cal}|null, known }
  function calcSmart(name, linesText) {
    var ing = calcRecipeCalorie(linesText || '');
    if (ing.total > 0) {
      return { total: ing.total, source: 'ingredient', dish: null, known: ing.known };
    }
    var d = lookupDish(name || '');
    if (d) {
      return { total: d.cal, source: 'dish', dish: d, known: 1 };
    }
    return { total: 0, source: 'none', dish: null, known: 0 };
  }

  // 把一个食物文本切成多个食物（支持 、，, ;； 换行 及空格 分隔）
  function tokenizeFoods(text) {
    // 支持 、，,;； 换行 空格 以及 + 作为分隔符
    return (text || '').split(/[\n、，,;；+＋]+|\s+/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function buildExpr(items) {
    return items.map(function (i) { return i.label + '(' + i.cal + ')'; }).join(' + ');
  }

  // 多食物加法算式：可在输入框同时输入「宫保鸡丁、番茄炒蛋」等多种食物
  // 优先级：有食材明细 → 用食材算式；否则 → 用菜名（含菜系菜谱 / 食材）逐一匹配并相加
  // 返回 { total, source, expression, items:[{label,cal,cuisine,unknown}] }
  function calcFormula(nameText, linesText) {
    var ingLines = (linesText || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    var ingItems = [];
    ingLines.forEach(function (l) {
      var p = parseIngredientLine(l);
      if (p && p.matched) {
        var label = p.name + (p.qty && p.qty !== 1 ? (' ' + p.qty + (p.unit || '')) : '');
        ingItems.push({ label: label, cal: p.calories, cuisine: '', unknown: false });
      }
    });
    if (ingItems.length) {
      var t1 = ingItems.reduce(function (s, i) { return s + i.cal; }, 0);
      return { total: t1, source: 'ingredient', expression: buildExpr(ingItems) + ' = ' + t1 + ' kcal', items: ingItems };
    }
    var tokens = tokenizeFoods(nameText || '');
    var dishItems = [];
    tokens.forEach(function (t) {
      var d = lookupDish(t);
      if (d) { dishItems.push({ label: d.name, cal: d.cal, cuisine: d.cuisine, unknown: false }); return; }
      var f = matchFood(t);
      if (f) {
        var cal = Math.round(f.ref.cal / 100 * (f.ref.gram || 100));
        dishItems.push({ label: t, cal: cal, cuisine: '', unknown: false });
      } else {
        dishItems.push({ label: t, cal: 0, cuisine: '', unknown: true });
      }
    });
    if (dishItems.length) {
      var t2 = dishItems.reduce(function (s, i) { return s + i.cal; }, 0);
      return { total: t2, source: 'dish', expression: buildExpr(dishItems) + ' = ' + t2 + ' kcal', items: dishItems };
    }
    return { total: 0, source: 'none', expression: '', items: [] };
  }

  // 搜索供“吃了什么”选择器使用（含菜系标签）
  function searchItems(q) {
    q = (q || '').trim();
    var res = [];
    Object.keys(FOODS).forEach(function (k) {
      if (!q || k.indexOf(q) >= 0) res.push({ type: 'food', name: k, cal: FOODS[k].cal, unit: FOODS[k].unit, gram: FOODS[k].gram, cuisine: '' });
    });
    Object.keys(DISH_DB).forEach(function (k) {
      if (!q || k.indexOf(q) >= 0) res.push({ type: 'dish', name: k, cal: DISH_DB[k].cal, unit: '份', gram: 0, cuisine: DISH_DB[k].cuisine });
    });
    return res.slice(0, 20);
  }

  // 按菜系列出菜品（用于展示/速查）
  function listByCuisine(cuisine) {
    var out = [];
    Object.keys(DISH_DB).forEach(function (k) {
      if (!cuisine || DISH_DB[k].cuisine === cuisine) out.push({ name: k, cal: DISH_DB[k].cal, cuisine: DISH_DB[k].cuisine });
    });
    return out;
  }

  // 从选择器条目生成一条“吃了”记录（系统自动算热量）
  function buildEatenItem(item) {
    if (item.type === 'dish') {
      return { name: item.name, calories: item.cal, portion: '1' + (item.unit || '份') };
    }
    var cal = Math.round(item.cal / 100 * (item.gram || 100));
    return { name: item.name, calories: cal, portion: '1' + (item.unit || '份') };
  }

  global.Cal = {
    FOODS: FOODS, DISHES: DISHES, DISH_DB: DISH_DB, CUISINES: CUISINES,
    matchFood: matchFood, lookupDish: lookupDish,
    parseIngredientLine: parseIngredientLine,
    calcRecipeCalorie: calcRecipeCalorie, calcSmart: calcSmart,
    tokenizeFoods: tokenizeFoods, calcFormula: calcFormula,
    searchItems: searchItems, listByCuisine: listByCuisine,
    buildEatenItem: buildEatenItem
  };
})(window);

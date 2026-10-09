/**
 * 万象颜文字功能安装脚本
 *
 * 前提：wanxiang 方案必须已安装
 *
 * 功能：
 * 1. 应用 lua 补丁（super_symbols.lua 添加 kaomoji 支持）
 * 2. 合并配置到 wanxiang.custom.yaml
 *
 * 注意：lua/data/kaomoji*.txt 由 recipe.files 自动复制，脚本无需处理
 */
function install(context) {
    const { files, log, env } = context;

    log("════════════════════════════════════════════");
    log("  万象颜文字功能安装");
    log("  RIME 目录: " + env.rimeDir());
    log("════════════════════════════════════════════");
    log("");

    // ── 前置检查：wanxiang 方案是否存在 ──
    const wanxiangSchema = "wanxiang.schema.yaml";
    const wanxiangT9Schema = "wanxiang_t9.schema.yaml";
    const wanxiangLuaDir = "lua/wanxiang";

    if (!files.exists(wanxiangSchema)) {
        log("❌ 未检测到万象拼音方案（" + wanxiangSchema + " 不存在）");
        log("");
        log("请先安装万象拼音方案，再安装本扩展包。");
        throw new Error("依赖方案未安装: wanxiang");
    }

    log("✓ 已检测到万象拼音方案");
    if (files.exists(wanxiangT9Schema)) log("✓ 已检测到万象拼音T9方案");
    log("");

    let failCount = 0;

    // ── 步骤 1：应用 lua 补丁 ──
    log("【1/2】应用 lua 补丁（super_symbols.lua）");
    
    const targetLua = "lua/wanxiang/super_symbols.lua";
    
    if (!files.exists(targetLua)) {
        log("  ! 目标文件不存在: " + targetLua);
        log("    跳过补丁（新版万象可能已支持或文件结构变化）");
        log("    请手动检查是否需要修改 super_symbols.lua 添加 kaomoji 支持");
    } else {
        const luaContent = files.read(targetLua);
        
        if (luaContent === null) {
            log("  ✗ 读取失败: " + targetLua);
            failCount++;
        } else if (luaContent.indexOf("data_kaomoji") !== -1) {
            log("  ✓ 补丁已应用过（检测到 data_kaomoji），跳过");
        } else {
            // 应用补丁：添加 kaomoji 支持
            let patched = luaContent;
            
            // 补丁 1: 添加 kaomoji_path 变量
            const pattern1 = /local emoji_path = config:get_string\("super_symbols\/data_emoji"\) or "lua\/data\/codex_emoji\.txt"/;
            const replacement1 = `local emoji_path = config:get_string("super_symbols/data_emoji") or "lua/data/codex_emoji.txt"
        local kaomoji_path = config:get_string("super_symbols/data_kaomoji") or "lua/data/kaomoji.txt"`;
            
            if (pattern1.test(patched)) {
                patched = patched.replace(pattern1, replacement1);
                log("  ✓ 已添加 kaomoji_path 变量");
            } else {
                log("  ! 未找到 emoji_path 定义，跳过 kaomoji_path 添加");
            }
            
            // 补丁 2: 添加 kaomoji 到 super_symbols_stores
            const pattern2 = /emoji = read_store\(emoji_path, "super_emoji"\)\s*\}/;
            const replacement2 = `emoji = read_store(emoji_path, "super_emoji"),
            kaomoji = read_store(kaomoji_path, "super_kaomoji")
        }`;
            
            if (pattern2.test(patched)) {
                patched = patched.replace(pattern2, replacement2);
                log("  ✓ 已添加 kaomoji store");
            } else {
                log("  ! 未找到 super_symbols_stores 定义，跳过 kaomoji store 添加");
            }
            
            // 补丁 3: 添加 kaomoji_prefix 变量
            const pattern3 = /local emoji_prefix = config:get_string\("super_symbols\/prefix_emoji"\) or "\/emoji"/;
            const replacement3 = `local emoji_prefix = config:get_string("super_symbols/prefix_emoji") or "/emoji"
    local kaomoji_prefix = config:get_string("super_symbols/prefix_kaomoji") or "/kk"`;
            
            if (pattern3.test(patched)) {
                patched = patched.replace(pattern3, replacement3);
                log("  ✓ 已添加 kaomoji_prefix 变量");
            } else {
                log("  ! 未找到 emoji_prefix 定义，跳过 kaomoji_prefix 添加");
            }
            
            // 补丁 4: 添加 kaomoji trigger_def
            const pattern4 = /trigger_defs\[#trigger_defs \+ 1\] = \{\s*kind = "emoji",\s*exact = emoji_prefix,\s*label = "超级表情",\s*search_marks = \{"\?", "\/"\}\s*\}/;
            const replacement4 = `trigger_defs[#trigger_defs + 1] = {
        kind = "emoji",
        exact = emoji_prefix,
        label = "超级表情",
        search_marks = {"?", "/"}
    }

    trigger_defs[#trigger_defs + 1] = {
        kind = "kaomoji",
        exact = kaomoji_prefix,
        label = "颜文字",
        search_marks = {"?", "/"}
    }`;
            
            if (pattern4.test(patched)) {
                patched = patched.replace(pattern4, replacement4);
                log("  ✓ 已添加 kaomoji trigger_def");
            } else {
                log("  ! 未找到 emoji trigger_def，跳过 kaomoji trigger_def 添加");
                log("    可能需要手动修改 super_symbols.lua");
                failCount++;
            }
            
            // 写回补丁后的文件
            files.write(targetLua, patched);
            log("  ✓ 补丁已应用");
        }
    }
    
    log("");
    
    // ── 步骤 2：合并配置 ──
    log("【2/2】配置合并");
    
    const customYaml = "wanxiang.custom.yaml";
    const patchConfig = `
  # ===== 颜文字功能开始 =====
  # super_symbols 新增 kaomoji 类型（前缀 /kk）
  super_symbols/triggers:
    - { kind: sym,      exact: /sym,   label: 超级符号, marks: ["?", "/"] }
    - { kind: emoji,    exact: /emoji, label: 超级表情, marks: ["?", "/"] }
    - { kind: kaomoji,  exact: /kk,    label: 颜文字,   marks: ["?", "/"] }
  super_symbols/data_kaomoji: "lua/data/kaomoji.txt"

  # recognizer 增加 /kk 模式识别，避免被 punct 抢先
  recognizer/patterns/super_kaomoji: "^/kk[.?/][A-Za-z.]*$"
  recognizer/patterns/super_kaomoji_pre: "^/kk[.?/]?$"

  # 候选区直接出颜文字（输入中文词时自动追加，常驻生效）
  super_replacer/rules/+:
    - option: true
      mode: append
      comment_mode: none
      tags: [abc]
      prefix: _kk_
      files:
        - lua/data/kaomoji_replacer.txt
  # ===== 颜文字功能结束 =====
`;
    
    if (files.exists(customYaml)) {
        const customContent = files.read(customYaml);
        
        if (customContent === null) {
            log("  ✗ 读取失败: " + customYaml);
            failCount++;
        } else if (customContent.indexOf("kaomoji") !== -1 && customContent.indexOf("_kk_") !== -1) {
            log("  ✓ wanxiang.custom.yaml 已包含颜文字配置");
        } else {
            // 追加配置到 patch: 节点下
            let updated = customContent;
            
            // 检查是否有 patch: 节点
            if (updated.indexOf("patch:") !== -1) {
                // 在文件末尾追加配置
                updated = updated.trimEnd() + "\n" + patchConfig;
                files.write(customYaml, updated);
                log("  ✓ 已追加配置到 wanxiang.custom.yaml");
            } else {
                // 没有 patch: 节点，添加一个
                updated = updated.trimEnd() + "\n\npatch:\n" + patchConfig;
                files.write(customYaml, updated);
                log("  ✓ 已创建 patch: 节点并添加配置");
            }
        }
    } else {
        // 创建新的 wanxiang.custom.yaml
        const newContent = "patch:\n" + patchConfig;
        files.write(customYaml, newContent);
        log("  ✓ 已创建 wanxiang.custom.yaml 并添加配置");
    }

    const customT9Yaml = "wanxiang_t9.custom.yaml";
    if (files.exists(customT9Yaml)) {
            const customContent = files.read(customT9Yaml);

            if (customContent === null) {
                log("  ✗ 读取失败: " + customT9Yaml);
                failCount++;
            } else if (customContent.indexOf("kaomoji") !== -1 && customContent.indexOf("_kk_") !== -1) {
                log("  ✓ wanxiang_t9.custom.yaml 已包含颜文字配置");
            } else {
                // 追加配置到 patch: 节点下
                let updated = customContent;

                // 检查是否有 patch: 节点
                if (updated.indexOf("patch:") !== -1) {
                    // 在文件末尾追加配置
                    updated = updated.trimEnd() + "\n" + patchConfig;
                    files.write(customT9Yaml, updated);
                    log("  ✓ 已追加配置到 wanxiang_t9.custom.yaml");
                } else {
                    // 没有 patch: 节点，添加一个
                    updated = updated.trimEnd() + "\n\npatch:\n" + patchConfig;
                    files.write(customT9Yaml, updated);
                    log("  ✓ 已创建 patch: 节点并添加配置");
                }
            }
        } else {
            // 创建新的 wanxiang_t9.custom.yaml
            const newContent = "patch:\n" + patchConfig;
            files.write(customT9Yaml, newContent);
            log("  ✓ 已创建 wanxiang_t9.custom.yaml 并添加配置");
        }
    
    log("");
    log("════════════════════════════════════════════");
    
    if (failCount === 0) {
        log("✅ 安装完成");
        log("");
        log("下一步：重新部署 RIME");
        log("");
        log("测试:");
        log("  1. 输入 /kk          → 提示「颜文字」");
        log("  2. 输入 /kk.happy    → 开心类颜文字");
        log("  3. 输入 /kk?kaixin   → 模糊搜索");
        log("  4. 输入 开心          → 候选区直接出现颜文字");
    } else {
        log("⚠️ 安装完成，但有 " + failCount + " 项需手动处理（见上方提示）");
    }
    
    log("════════════════════════════════════════════");
}

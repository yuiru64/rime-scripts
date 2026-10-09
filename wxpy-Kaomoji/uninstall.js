/**
 * 万象颜文字功能卸载脚本
 *
 * 功能：
 * 1. 还原 lua 补丁（移除 kaomoji 支持）
 * 2. 清理 wanxiang.custom.yaml 中的颜文字配置
 *
 * 注意：lua/data/kaomoji*.txt 由系统自动清理（recipe.files 复制的），脚本无需处理
 */
function uninstall(context) {
    const { files, log, env } = context;

    log("════════════════════════════════════════════");
    log("  万象颜文字功能卸载");
    log("  RIME 目录: " + env.rimeDir());
    log("════════════════════════════════════════════");
    log("");

    let failCount = 0;

    // ── 步骤 1：还原 lua 补丁 ──
    log("【1/2】还原 lua 补丁（super_symbols.lua）");
    
    const targetLua = "lua/wanxiang/super_symbols.lua";
    
    if (!files.exists(targetLua)) {
        log("  ! 目标文件不存在: " + targetLua);
        log("    跳过还原");
    } else {
        const luaContent = files.read(targetLua);
        
        if (luaContent === null) {
            log("  ✗ 读取失败: " + targetLua);
            failCount++;
        } else if (luaContent.indexOf("data_kaomoji") === -1) {
            log("  ✓ 补丁未应用或已还原，跳过");
        } else {
            // 还原补丁：移除 kaomoji 支持
            let restored = luaContent;
            
            // 还原 1: 移除 kaomoji_path 变量
            const pattern1 = /\s*local kaomoji_path = config:get_string\("super_symbols\/data_kaomoji"\) or "lua\/data\/kaomoji\.txt"/;
            if (pattern1.test(restored)) {
                restored = restored.replace(pattern1, "");
                log("  ✓ 已移除 kaomoji_path 变量");
            }
            
            // 还原 2: 移除 kaomoji store
            const pattern2 = /,\s*kaomoji = read_store\(kaomoji_path, "super_kaomoji"\)/;
            if (pattern2.test(restored)) {
                restored = restored.replace(pattern2, "");
                log("  ✓ 已移除 kaomoji store");
            }
            
            // 还原 3: 移除 kaomoji_prefix 变量
            const pattern3 = /\s*local kaomoji_prefix = config:get_string\("super_symbols\/prefix_kaomoji"\) or "\/kk"/;
            if (pattern3.test(restored)) {
                restored = restored.replace(pattern3, "");
                log("  ✓ 已移除 kaomoji_prefix 变量");
            }
            
            // 还原 4: 移除 kaomoji trigger_def
            const pattern4 = /\s*trigger_defs\[#trigger_defs \+ 1\] = \{\s*kind = "kaomoji",\s*exact = kaomoji_prefix,\s*label = "颜文字",\s*search_marks = \{"\?", "\/"\}\s*\}/;
            if (pattern4.test(restored)) {
                restored = restored.replace(pattern4, "");
                log("  ✓ 已移除 kaomoji trigger_def");
            }
            
            // 写回还原后的文件
            files.write(targetLua, restored);
            log("  ✓ 补丁已还原");
        }
    }
    
    log("");
    
    // ── 步骤 2：清理配置 ──
    log("【2/2】清理配置");
    
    const customYaml = "wanxiang.custom.yaml";
    
    if (!files.exists(customYaml)) {
        log("  ! 配置文件不存在: " + customYaml);
        log("    跳过清理");
    } else {
        const customContent = files.read(customYaml);
        
        if (customContent === null) {
            log("  ✗ 读取失败: " + customYaml);
            failCount++;
        } else if (customContent.indexOf("kaomoji") === -1 && customContent.indexOf("_kk_") === -1) {
            log("  ✓ 配置中未包含颜文字相关内容，跳过");
        } else {
            // 移除颜文字配置块
            let cleaned = customContent;
            
            // 移除颜文字功能配置块（从 "# ===== 颜文字功能开始 =====" 到 "# ===== 颜文字功能结束 ====="）
            const configBlockPattern = /\s*# ===== 颜文字功能开始 =====[\s\S]*?# ===== 颜文字功能结束 =====\s*/;
            if (configBlockPattern.test(cleaned)) {
                cleaned = cleaned.replace(configBlockPattern, "\n");
                log("  ✓ 已移除颜文字配置块");
            } else {
                // 如果没有完整的标记块，尝试逐行移除
                const lines = cleaned.split("\n");
                const filteredLines = lines.filter(line => {
                    return !line.includes("kaomoji") && 
                           !line.includes("_kk_") &&
                           !line.includes("super_kaomoji") &&
                           !line.includes("/kk");
                });
                cleaned = filteredLines.join("\n");
                log("  ✓ 已清理颜文字相关配置");
            }
            
            // 清理多余的空行
            cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();
            
            files.write(customYaml, cleaned);
            log("  ✓ 配置 wanxiang.custom.yaml 已清理");
        }
    }

     const customT9Yaml = "wanxiang_t9.custom.yaml";

        if (!files.exists(customT9Yaml)) {
            log("  ! 配置文件不存在: " + customT9Yaml);
            log("    跳过清理");
        } else {
            const customContent = files.read(customT9Yaml);

            if (customContent === null) {
                log("  ✗ 读取失败: " + customT9Yaml);
                failCount++;
            } else if (customContent.indexOf("kaomoji") === -1 && customContent.indexOf("_kk_") === -1) {
                log("  ✓ 配置中未包含颜文字相关内容，跳过");
            } else {
                // 移除颜文字配置块
                let cleaned = customContent;

                // 移除颜文字功能配置块（从 "# ===== 颜文字功能开始 =====" 到 "# ===== 颜文字功能结束 ====="）
                const configBlockPattern = /\s*# ===== 颜文字功能开始 =====[\s\S]*?# ===== 颜文字功能结束 =====\s*/;
                if (configBlockPattern.test(cleaned)) {
                    cleaned = cleaned.replace(configBlockPattern, "\n");
                    log("  ✓ 已移除颜文字配置块");
                } else {
                    // 如果没有完整的标记块，尝试逐行移除
                    const lines = cleaned.split("\n");
                    const filteredLines = lines.filter(line => {
                        return !line.includes("kaomoji") &&
                               !line.includes("_kk_") &&
                               !line.includes("super_kaomoji") &&
                               !line.includes("/kk");
                    });
                    cleaned = filteredLines.join("\n");
                    log("  ✓ 已清理颜文字相关配置");
                }

                // 清理多余的空行
                cleaned = cleaned.replace(/\n{3,}/g, "\n\n").trim();

                files.write(customT9Yaml, cleaned);
                log("  ✓ 配置 wanxiang.custom.yaml 已清理");
            }
        }
    
    log("");
    log("════════════════════════════════════════════");
    
    if (failCount === 0) {
        log("✅ 卸载完成");
        log("");
        log("下一步：重新部署 RIME");
    } else {
        log("⚠️ 卸载完成，但有 " + failCount + " 项需手动处理（见上方提示）");
    }
    
    log("════════════════════════════════════════════");
}

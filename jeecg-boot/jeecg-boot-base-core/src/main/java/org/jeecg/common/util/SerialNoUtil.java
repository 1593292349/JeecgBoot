package org.jeecg.common.util;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.TimeUnit;

/**
 * 编号生成工具：自定义前缀 + 8位日期 + 3位自增数（如 GB20260826001）
 * 不同前缀每天独立计数，Redis INCR 原子自增，key 次日 00:00:00 过期自动清理
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class SerialNoUtil{

	private static final String KEY_PREFIX = "serial_no:";

	private static SerialNoUtil instance;

	private final RedisTemplate<String, Object> redisTemplate;

	@PostConstruct
	public void init(){
		instance = this;
	}

	/**
	 * 生成编号：prefix + yyyyMMdd + 3位自增数（如 GB20260826001）
	 */
	public static String generateNo(String prefix){
		if(prefix == null || prefix.isEmpty()){
			throw new IllegalArgumentException("编号前缀不能为空");
		}
		return instance.doGenerateNo(prefix);
	}

	private String doGenerateNo(String prefix){
		LocalDate today = LocalDate.now();
		String dateStr = today.format(DateTimeFormatter.BASIC_ISO_DATE);
		String key = KEY_PREFIX + prefix + ":" + dateStr;

		Long seq = redisTemplate.opsForValue().increment(key);
		if(seq == null){
			throw new IllegalStateException("Redis 生成编号序号失败");
		}
		// 每次生成都刷新过期时间（目标固定次日零点，重复设置不延长生命周期）；失败仅告警，后续调用自愈，避免 key 永不过期
		try{
			boolean expireResult = redisTemplate.expire(
				key,
				getExpireSecondsToNextDay(today),
				TimeUnit.SECONDS
			);
			if(!expireResult){
				log.warn("[SerialNoUtil] 设置编号 key 过期时间失败，key={}", key);
			}
		}catch(Exception e){
			log.warn("[SerialNoUtil] 设置编号 key 过期时间异常，key={}", key, e);
		}

		return prefix + dateStr + String.format("%03d", seq);
	}

	/**
	 * 到 date 次日 00:00:00 的剩余秒数（毫秒向上取整，确保 TTL 覆盖到次日零点）
	 */
	private long getExpireSecondsToNextDay(LocalDate date){
		long nextMidnight = date
			.plusDays(1)
			.atStartOfDay()
			.atZone(ZoneId.systemDefault())
			.toInstant()
			.toEpochMilli();
		return Math.max(
			1L,
			(long) Math.ceil((nextMidnight - System.currentTimeMillis()) / 1000.0)
		);
	}
}
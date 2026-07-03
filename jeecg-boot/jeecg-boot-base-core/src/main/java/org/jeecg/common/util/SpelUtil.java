package org.jeecg.common.util;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.core.DefaultParameterNameDiscoverer;
import org.springframework.core.ParameterNameDiscoverer;
import org.springframework.expression.Expression;
import org.springframework.expression.ExpressionParser;
import org.springframework.expression.spel.SpelCompilerMode;
import org.springframework.expression.spel.SpelParserConfiguration;
import org.springframework.expression.spel.standard.SpelExpressionParser;
import org.springframework.expression.spel.support.StandardEvaluationContext;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Spring-EL表达式工具类
 * @author 唐国雄
 */
@Component
public class SpelUtil{

	private final ExpressionParser PARSER = new SpelExpressionParser(
		new SpelParserConfiguration(SpelCompilerMode.IMMEDIATE, null)
	);
	private final ParameterNameDiscoverer PARAMETER_NAME_DISCOVERER = new DefaultParameterNameDiscoverer();

	private final Map<String, Expression> cache = new ConcurrentHashMap<>();

	public <T> T eval(
		String expression,
		Object root,
		Map<String, Object> context,
		Class<T> returnType
	){
		Expression expr = cache.computeIfAbsent(expression, PARSER::parseExpression);
		StandardEvaluationContext evaluationContext = root != null
			? new StandardEvaluationContext(root)
			: new StandardEvaluationContext();
		if(context != null){
			evaluationContext.setVariables(context);
		}
		return expr.getValue(evaluationContext, returnType);
	}

	public <T> T eval(
		String expression,
		Object target,
		Method method,
		Object[] args,
		Object result,
		Class<T> returnType
	){
		return eval(
			expression,
			new ExpressionInvokeContext(target, method, args, result),
			getParameterMap(method, args),
			returnType
		);
	}

	private Map<String, Object> getParameterMap(Method defineMethod, Object[] args){
		if(defineMethod.getParameterCount() > 0){
			String[] names = PARAMETER_NAME_DISCOVERER.getParameterNames(defineMethod);
			if(names != null){
				Map<String, Object> map = new HashMap<>();
				for(int i = 0; i < names.length; i++){
					map.put(names[i], args[i]);
				}
				return map;
			}
		}
		return Collections.emptyMap();
	}

	@AllArgsConstructor
	@Data
	public static class ExpressionInvokeContext{

		private Object target;
		private Method method;
		private Object[] args;
		private Object result;
	}
}
package com.pedrohenc.erp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/** Background housekeeping (e.g. expired scan sessions). */
@Configuration
@EnableScheduling
public class SchedulingConfig {
}
